import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const NOTABLE_KEY = "notable-pings:v1";
const MAX_NOTABLES = 10;

const FREQUENT_FLIERS_KEY = "frequent-fliers:v2";
const MAX_FREQUENT_FLIERS_STORED = 500;

const HEATMAP_KEY = "heatmap:v1";
// 90 days in seconds — when this expires, that callsign can count again in that cell
const HEATMAP_DEBOUNCE_TTL = 60 * 60 * 24 * 90;

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
  // Stored in UTC — good enough for a density heatmap near Whitefish (UTC-6/7)
  const hour = nowDate.getUTCHours();    // 0–23
  const weekday = nowDate.getUTCDay();   // 0 = Sunday … 6 = Saturday

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

  const nextFF = [...byCallsign.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_FREQUENT_FLIERS_STORED);

  await redis.set(FREQUENT_FLIERS_KEY, JSON.stringify(nextFF));

  // --- HEATMAP ---
  // grid[weekday][hour] = count of unique callsigns seen in that cell (rolling 90d).
  // Uniqueness enforced by per-callsign+cell keys with 90-day TTL. When TTL expires,
  // that callsign can count again — giving us a natural rolling window for free.

  const hmRaw = (await redis.get(HEATMAP_KEY)) ?? "null";
  let grid: number[][] | null = null;
  try {
    grid = JSON.parse(hmRaw);
  } catch {
    grid = null;
  }

  if (!grid || !Array.isArray(grid) || grid.length !== 7) {
    grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  }

  // Deduplicate callsigns within this payload before hitting Redis
  const callsignsThisBatch = new Set<string>();
  for (const f of payload.aircraft) {
    const cs = (f.flight || "").trim();
    if (!cs || cs === "00000000") continue;
    callsignsThisBatch.add(cs);
  }

  const csArray = [...callsignsThisBatch];

  // SET NX (only if not exists) with TTL — pipeline all at once
  const pipeline = redis.pipeline();
  for (const cs of csArray) {
    pipeline.set(`hm:${cs}:${weekday}:${hour}`, "1", "EX", HEATMAP_DEBOUNCE_TTL, "NX");
  }
  const results = await pipeline.exec();

  // "OK" means key was newly set = first time we've seen this callsign in this cell
  let gridDirty = false;
  for (let i = 0; i < csArray.length; i++) {
    const [err, val] = results![i] as [Error | null, string | null];
    if (!err && val === "OK") {
      grid[weekday][hour] += 1;
      gridDirty = true;
    }
  }

  if (gridDirty) {
    await redis.set(HEATMAP_KEY, JSON.stringify(grid));
  }

  // --- LATEST FLIGHTS ---
  await redis.set(
    "latest-flights",
    JSON.stringify({ receivedAt: now, data: payload }),
    "EX",
    180
  );

  return res.status(200).send("OK");
}