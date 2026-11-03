import type { VercelRequest, VercelResponse } from "./_vercel.js";
import { Redis } from "ioredis";
import { airlineFromFlight, heatmapTypes } from "../src/lib/flightClassify.js";

const redis = new Redis(process.env.REDIS_URL!);

const NOTABLE_KEY = "notable-pings:v1";
const MAX_NOTABLES = 10;

const FREQUENT_FLIERS_KEY = "frequent-fliers:v2";
const MAX_FREQUENT_FLIERS_STORED = 500;

// One marker per callsign per weekday/hour cell, kept 90 days. Nothing reads these on
// the site any more; they're the record of which callsigns we've seen, for auditing
// airline codes in Redis.
const SIGHTING_TTL = 60 * 60 * 24 * 90;

// Heatmap: per-day hashes of hourly counts, summed over the last 90 days when read.
const HEATMAP_DAY_TTL = 60 * 60 * 24 * 91;
// Sets of the planes already counted in the current hour, per type and scope.
const HEATMAP_HOUR_TTL = 60 * 60 * 2;
const NEAR_NM = 15;

// Per-aircraft position history, recorded at ingest so trails exist whether or not
// anyone has the map open. A trail expires once its plane stops being received.
const TRAIL_MAX_POINTS = 480; // ~2 hours at one ingest every 15 seconds
const TRAIL_TTL = 180;

const RX_LAT = 48.415;
const RX_LON = -114.459;

function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const secret =
    req.headers["x-flight-secret"] || req.headers["X-Flight-Secret"];

  if (!secret || secret !== process.env.FLIGHT_INGEST_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  let payload: any;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).send("Invalid JSON");
  }

  if (!payload || !Array.isArray(payload.aircraft)) {
    return res.status(400).send("Invalid payload");
  }

  const now = Date.now();
  const nowDate = new Date(now);
  // Convert to Mountain Time (MST = UTC-7, MDT = UTC-6), DST handled automatically
  const mtDate = new Date(nowDate.toLocaleString("en-US", { timeZone: "America/Denver" }));
  const hour = mtDate.getHours();
  const weekday = mtDate.getDay();

  // --- NOTABLE PINGS ---
  const raw = (await redis.get(NOTABLE_KEY)) ?? "[]";
  let notables: any[];
  try {
    notables = JSON.parse(raw);
  } catch {
    notables = [];
  }

  const byHex = new Map<string, any>(notables.map((n) => [n.hex, n]));

  for (const f of payload.aircraft) {
    const lat = f.lat ?? f.lat_baro;
    const lon = f.lon ?? f.lon_baro;
    if (!f.hex || lat == null || lon == null) continue;
    const d = Math.round(distanceNm(RX_LAT, RX_LON, lat, lon));
    const prev = byHex.get(f.hex);
    if (!prev || d > prev.maxDistance) {
      byHex.set(f.hex, {
        hex: f.hex,
        airline: f.op || "—",
        callsign: (f.flight || "").trim() || "NO CALLSIGN",
        maxDistance: d,
        lastSeen: now,
      });
    }
  }

  const next = [...byHex.values()]
    .sort((a, b) => b.maxDistance - a.maxDistance)
    .slice(0, MAX_NOTABLES);

  await redis.set(NOTABLE_KEY, JSON.stringify(next));

  // --- FREQUENT FLIERS ---
  const DEBOUNCE_MS = 60 * 60 * 1000;

  const ffRaw = (await redis.get(FREQUENT_FLIERS_KEY)) ?? "[]";
  let frequentFliers: any[];
  try {
    frequentFliers = JSON.parse(ffRaw);
  } catch {
    frequentFliers = [];
  }

  const byCallsign = new Map<string, any>(
    frequentFliers.map((f) => [f.callsign, f])
  );

  for (const f of payload.aircraft) {
    const cs = (f.flight || "").trim();
    if (!cs || cs === "00000000") continue;
    const prev = byCallsign.get(cs);
    if (prev) {
      if (now - prev.lastCountedAt > DEBOUNCE_MS) {
        prev.count += 1;
        prev.lastCountedAt = now;
        prev.lastSeen = now;
        prev.airline = f.op || prev.airline || "—";
      }
    } else {
      byCallsign.set(cs, {
        callsign: cs,
        airline: f.op || "—",
        count: 1,
        lastCountedAt: now,
        lastSeen: now,
      });
    }
  }

  // Ties go to the most recent, so once the list is full a new callsign displaces the
  // stalest one-timer instead of always being the one cut.
  const nextFF = [...byCallsign.values()]
    .sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen)
    .slice(0, MAX_FREQUENT_FLIERS_STORED);

  await redis.set(FREQUENT_FLIERS_KEY, JSON.stringify(nextFF));

  // --- SIGHTINGS ---
  const sightingPipeline = redis.pipeline();
  for (const f of payload.aircraft) {
    const cs = (f.flight || "").trim();
    const id = cs && cs !== "00000000" ? cs : f.hex;
    if (id) sightingPipeline.set(`hm:${id}:${weekday}:${hour}`, "1", "EX", SIGHTING_TTL, "NX");
  }
  await sightingPipeline.exec();

  // --- HEATMAP ---
  // Each plane counts once per hour in "all" and in its type, and again in the "near"
  // scope if it comes within NEAR_NM. Counting by hex means a plane whose callsign shows
  // up partway through the hour is added to its type then, without being double counted.
  const day = `${mtDate.getFullYear()}-${String(mtDate.getMonth() + 1).padStart(2, "0")}-${String(mtDate.getDate()).padStart(2, "0")}`;
  const fields: string[] = [];
  const setKeys = new Set<string>();
  const addPipeline = redis.pipeline();
  for (const f of payload.aircraft) {
    if (!f.hex) continue;
    const lat = f.lat ?? f.lat_baro;
    const lon = f.lon ?? f.lon_baro;
    const near = lat != null && lon != null && distanceNm(RX_LAT, RX_LON, lat, lon) <= NEAR_NM;
    const types = heatmapTypes(f);
    const planeFields = types.flatMap((type) =>
      (near ? ["any", "near"] : ["any"]).map((scope) => `${hour}|${type}|${scope}`)
    );
    // Per-airline counts, for each cell's most common airline.
    if (types.includes("airline")) planeFields.push(`${hour}|op:${airlineFromFlight(f)}`);
    for (const field of planeFields) {
      const key = `hmh:${day}:${field}`;
      addPipeline.sadd(key, f.hex);
      fields.push(field);
      setKeys.add(key);
    }
  }
  for (const key of setKeys) addPipeline.expire(key, HEATMAP_HOUR_TTL);
  const added = (await addPipeline.exec()) ?? [];

  const dayKey = `hmd:${day}`;
  const countPipeline = redis.pipeline();
  let counted = false;
  fields.forEach((field, i) => {
    const [err, val] = added[i] as [Error | null, number];
    if (!err && val === 1) {
      countPipeline.hincrby(dayKey, field, 1);
      counted = true;
    }
  });
  if (counted) {
    countPipeline.expire(dayKey, HEATMAP_DAY_TTL);
    await countPipeline.exec();
  }

  // --- TRAILS ---
  const trailPipeline = redis.pipeline();
  for (const f of payload.aircraft) {
    if (!f.hex || f.lat == null || f.lon == null) continue;
    // Stale positions linger in the receiver's list after a plane leaves range;
    // skipping them lets the trail expire.
    if (typeof f.seen_pos === "number" && f.seen_pos > 60) continue;
    const key = `trail:${f.hex}`;
    trailPipeline.rpush(key, `${f.lat.toFixed(4)},${f.lon.toFixed(4)}`);
    trailPipeline.ltrim(key, -TRAIL_MAX_POINTS, -1);
    trailPipeline.expire(key, TRAIL_TTL);
  }
  await trailPipeline.exec();

  // --- LAST KNOWN CALLSIGNS ---
  // Callsigns arrive in separate messages from positions, so some batches omit them.
  // Remember each plane's last callsign while it stays in range; /api/flights fills gaps.
  const csPipeline = redis.pipeline();
  for (const f of payload.aircraft) {
    if (!f.hex) continue;
    const cs = (f.flight || "").trim();
    const key = `callsign:${f.hex}`;
    if (cs && cs !== "00000000") {
      csPipeline.set(key, cs, "EX", TRAIL_TTL);
    } else {
      csPipeline.expire(key, TRAIL_TTL);
    }
  }
  await csPipeline.exec();

  // --- LATEST FLIGHTS ---
  await redis.set(
    "latest-flights",
    JSON.stringify({ receivedAt: now, data: payload }),
    "EX",
    180
  );

  return res.status(200).send("OK");
}