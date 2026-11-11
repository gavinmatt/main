import type { VercelRequest, VercelResponse } from "./_vercel.js";
import { Redis } from "ioredis";
import { airlineFromFlight, heatmapTypes, isGarbledCallsign } from "../src/lib/flightClassify.js";
import { bearingDeg, isImpossibleJump, maxHearableNm } from "../src/lib/positionChecks.js";

const redis = new Redis(process.env.REDIS_URL!);

const NOTABLE_KEY = "notable-pings:v1";
const MAX_NOTABLES = 10;
// Beyond line of sight for any antenna this receiver could have; anything farther is a
// bad position decode, and would otherwise hold the record forever.
const MAX_PLAUSIBLE_NM = 300;

// Highest and fastest planes heard, one row per plane with its best reading.
const HIGHEST_KEY = "records:highest:v1";
const FASTEST_KEY = "records:fastest:v1";
const MAX_RECORDS = 10;
// Above anything that flies over Montana (a U-2 tops out near 70,000 ft) or faster
// than a jet stream tailwind can push an airliner; beyond these is a bad decode.
const MAX_PLAUSIBLE_FT = 75_000;
const MAX_PLAUSIBLE_KT = 800;

// Each day's longest valid reception, scored by distance, for judging how good a
// distant ping is against this receiver's own recent range.
const DAILY_RANGE_KEY = "range:daily";

// Frequent fliers: per-day hashes of callsign -> hours seen that day, kept 90 days.
const FLIERS_DAY_TTL = 60 * 60 * 24 * 91;

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

// Density map: monthly hashes of grid cell -> planes that passed through, read three
// months at a time. Cells are 0.05° lat × 0.075° lon, about 3 NM square at this
// latitude. Each plane counts once per cell per clock hour, so one plane circling for an
// afternoon adds a few passes rather than outshining an airway.
const DENSITY_LAT_STEP = 0.05;
const DENSITY_LON_STEP = 0.075;
const DENSITY_MONTH_TTL = 60 * 60 * 24 * 100;
// Sets of hex|cell pairs already counted in the current hour.
const DENSITY_HOUR_TTL = 60 * 60 * 2;

// Coverage rose: per-day sorted sets of compass sector -> furthest trusted distance.
const COVERAGE_SECTOR_DEG = 10;
const COVERAGE_DAY_TTL = 60 * 60 * 24 * 91;

// Each plane's last accepted position fix, for spotting impossible jumps.
const FIX_TTL = 180;

const RX_LAT = 48.41;
const RX_LON = -114.444;

// Mountain Time calendar date as YYYY-MM-DD.
function mtDayString(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
}

// Distance to a plane, only when its position is one to trust for a range record: a
// fresh ADS-B fix (not MLAT or TIS-B, which can be miles off) within line of sight.
function trustedDistance(f: any) {
  if (!f.hex || f.lat == null || f.lon == null) return null;
  if (f.type && !/^(adsb|adsr)/.test(f.type)) return null;
  if (typeof f.seen_pos === "number" && f.seen_pos > 30) return null;
  const d = Math.round(distanceNm(RX_LAT, RX_LON, f.lat, f.lon));
  return d <= MAX_PLAUSIBLE_NM ? d : null;
}

// Only a fresh, direct ADS-B report of this field: MLAT and TIS-B values can be well off.
function isDirect(f: any, field: string) {
  if (f.type && !/^(adsb|adsr)/.test(f.type)) return false;
  if (typeof f.seen === "number" && f.seen > 30) return false;
  return !f.mlat?.includes(field) && !f.tisb?.includes(field);
}

function trustedAltitude(f: any) {
  if (typeof f.alt_baro !== "number" || typeof f.alt_geom !== "number") return null;
  if (!isDirect(f, "alt_baro")) return null;
  // The two altitudes come from separate sensors, so a bad decode rarely moves both.
  if (Math.abs(f.alt_baro - f.alt_geom) > 3000) return null;
  return f.alt_baro <= MAX_PLAUSIBLE_FT ? f.alt_baro : null;
}

// Ground speed, so a tailwind counts; only in the air, where taxiing decodes can't land.
function trustedSpeed(f: any) {
  if (typeof f.gs !== "number" || typeof f.alt_baro !== "number") return null;
  if (!isDirect(f, "gs")) return null;
  return f.gs <= MAX_PLAUSIBLE_KT ? Math.round(f.gs) : null;
}

// A plane often sends its callsign only once it's closer, so fill in a record that was
// set without one.
function fillIdentity(byHex: Map<string, any>, aircraft: any[]) {
  for (const f of aircraft) {
    const n = byHex.get(f.hex);
    const cs = (f.flight || "").trim();
    if (n && cs && n.callsign === "No callsign") {
      n.callsign = cs;
      if (f.op) n.airline = f.op;
    }
    if (n && !n.category && f.category) n.category = f.category;
  }
}

async function readRecords(key: string): Promise<any[]> {
  try {
    return JSON.parse((await redis.get(key)) ?? "[]");
  } catch {
    return [];
  }
}

// Keeps each plane's best reading of one measure, then the top ten planes by it.
async function updateRecords(key: string, aircraft: any[], measure: (f: any) => number | null, extra: (f: any) => object, now: number) {
  const records = await readRecords(key);
  const byHex = new Map<string, any>(records.map((r) => [r.hex, r]));
  for (const f of aircraft) {
    const v = measure(f);
    if (v == null || !f.hex) continue;
    const prev = byHex.get(f.hex);
    if (prev && v <= prev.value) continue;
    byHex.set(f.hex, {
      hex: f.hex,
      airline: f.op || "—",
      callsign: (f.flight || "").trim() || "No callsign",
      category: f.category ?? prev?.category,
      value: v,
      ...extra(f),
      lastSeen: now,
    });
  }
  fillIdentity(byHex, aircraft);
  const next = [...byHex.values()].sort((a, b) => b.value - a.value).slice(0, MAX_RECORDS);
  await redis.set(key, JSON.stringify(next));
}

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
  const day = mtDayString(nowDate);

  // --- CLEAN INPUT ---
  // Drop corrupt callsigns and impossible positions up front, so nothing below (records,
  // trails, density, the live map) ever sees them.
  const fixPipeline = redis.pipeline();
  const located = payload.aircraft.filter((f: any) => f.hex && f.lat != null && f.lon != null);
  for (const f of located) fixPipeline.get(`fix:${f.hex}`);
  const prevFixes = (await fixPipeline.exec()) ?? [];
  const savePipeline = redis.pipeline();
  located.forEach((f: any, i: number) => {
    const fix = { lat: f.lat, lon: f.lon, t: now - (f.seen_pos ?? 0) * 1000 };
    const [lat, lon, t] = ((prevFixes[i]?.[1] as string | null) ?? "").split(",").map(Number);
    const prev = Number.isFinite(t) ? { lat, lon, t } : null;
    const tooFar = distanceNm(RX_LAT, RX_LON, f.lat, f.lon) > maxHearableNm(f.alt_geom ?? f.alt_baro);
    if (tooFar || isImpossibleJump(prev, fix)) {
      // The last good fix is kept, so a single bad decode doesn't also reject the next one.
      delete f.lat;
      delete f.lon;
      return;
    }
    if (!prev || fix.t > prev.t) savePipeline.set(`fix:${f.hex}`, `${fix.lat},${fix.lon},${fix.t}`, "EX", FIX_TTL);
  });
  await savePipeline.exec();
  for (const f of payload.aircraft) {
    if (isGarbledCallsign(f.flight)) delete f.flight;
  }

  // --- NOTABLE PINGS ---
  const raw = (await redis.get(NOTABLE_KEY)) ?? "[]";
  let notables: any[];
  try {
    notables = JSON.parse(raw);
  } catch {
    notables = [];
  }

  const byHex = new Map<string, any>(
    notables.filter((n) => n.maxDistance <= MAX_PLAUSIBLE_NM).map((n) => [n.hex, n])
  );

  let batchMax = 0;
  const sectorMax = new Map<number, number>();
  for (const f of payload.aircraft) {
    const d = trustedDistance(f);
    if (d == null) continue;
    batchMax = Math.max(batchMax, d);
    const bearing = bearingDeg(RX_LAT, RX_LON, f.lat, f.lon);
    const sector = Math.floor(bearing / COVERAGE_SECTOR_DEG);
    sectorMax.set(sector, Math.max(sectorMax.get(sector) ?? 0, d));
    const alt = f.alt_geom ?? f.alt_baro;
    const prev = byHex.get(f.hex);
    if (!prev || d > prev.maxDistance) {
      byHex.set(f.hex, {
        hex: f.hex,
        airline: f.op || "—",
        callsign: (f.flight || "").trim() || "No callsign",
        category: f.category ?? prev?.category,
        bearing: Math.round(bearing),
        altitude: typeof alt === "number" ? alt : undefined,
        maxDistance: d,
        lastSeen: now,
      });
    }
  }
  fillIdentity(byHex, payload.aircraft);

  const next = [...byHex.values()]
    .sort((a, b) => b.maxDistance - a.maxDistance)
    .slice(0, MAX_NOTABLES);

  await redis.set(NOTABLE_KEY, JSON.stringify(next));

  // --- HIGHEST AND FASTEST ---
  await Promise.all([
    updateRecords(HIGHEST_KEY, payload.aircraft, trustedAltitude, () => ({}), now),
    updateRecords(FASTEST_KEY, payload.aircraft, trustedSpeed, (f) => ({ track: typeof f.track === "number" ? Math.round(f.track) : undefined, altitude: trustedAltitude(f) ?? undefined }), now),
  ]);

  // --- DAILY RANGE ---
  if (batchMax > 0) {
    // GT only ever raises a day's score.
    await redis.zadd(DAILY_RANGE_KEY, "GT", batchMax, day);
    // Drop the day that just aged past 60.
    await redis.zrem(DAILY_RANGE_KEY, mtDayString(new Date(now - 61 * 86400000)));
  }

  // --- COVERAGE ---
  if (sectorMax.size) {
    const coverageKey = `cov:${day}`;
    const coveragePipeline = redis.pipeline();
    for (const [sector, d] of sectorMax) coveragePipeline.zadd(coverageKey, "GT", d, String(sector));
    coveragePipeline.expire(coverageKey, COVERAGE_DAY_TTL);
    await coveragePipeline.exec();
  }

  // --- FREQUENT FLIERS ---
  // Each callsign counts once per clock hour it's seen; the API sums the last 90 days.
  const callsigns = [
    ...new Set(
      payload.aircraft
        .map((f: any) => (f.flight || "").trim())
        .filter((cs: string) => cs && cs !== "00000000")
    ),
  ] as string[];
  if (callsigns.length) {
    const hourKey = `ffh:${day}:${hour}`;
    const seenPipeline = redis.pipeline();
    for (const cs of callsigns) seenPipeline.sadd(hourKey, cs);
    seenPipeline.expire(hourKey, 60 * 60 * 2);
    const seen = (await seenPipeline.exec()) ?? [];
    const fresh = callsigns.filter((_, i) => seen[i]?.[1] === 1);
    if (fresh.length) {
      const dayKey = `ffd:${day}`;
      const ffPipeline = redis.pipeline();
      for (const cs of fresh) ffPipeline.hincrby(dayKey, cs, 1);
      ffPipeline.expire(dayKey, FLIERS_DAY_TTL);
      await ffPipeline.exec();
    }
  }

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

  // --- DENSITY ---
  const cells: string[] = [];
  const passHourKey = `pdh:${day}:${hour}`;
  const passPipeline = redis.pipeline();
  for (const f of payload.aircraft) {
    if (trustedDistance(f) == null) continue;
    const cell = `${Math.floor(f.lat / DENSITY_LAT_STEP)},${Math.floor(f.lon / DENSITY_LON_STEP)}`;
    passPipeline.sadd(passHourKey, `${f.hex}|${cell}`);
    cells.push(cell);
  }
  if (cells.length) {
    passPipeline.expire(passHourKey, DENSITY_HOUR_TTL);
    const passed = (await passPipeline.exec()) ?? [];
    const densityKey = `pdp:${day.slice(0, 7)}`;
    const densityPipeline = redis.pipeline();
    let counted = false;
    cells.forEach((cell, i) => {
      if (passed[i]?.[1] === 1) {
        densityPipeline.hincrby(densityKey, cell, 1);
        counted = true;
      }
    });
    if (counted) {
      densityPipeline.expire(densityKey, DENSITY_MONTH_TTL);
      densityPipeline.set("pdp:since", day, "NX");
      await densityPipeline.exec();
    }
  }

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