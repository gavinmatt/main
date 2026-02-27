import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const NOTABLE_KEY = "notable-pings:v1";
const MAX_NOTABLES = 10;

const FREQUENT_FLIERS_KEY = "frequent-fliers:v1";
const MAX_FREQUENT_FLIERS = 10;

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
        lastSeen: Date.now(),
      });
    }
  }

  const next = [...byHex.values()]
    .sort((a, b) => b.maxDistance - a.maxDistance)
    .slice(0, MAX_NOTABLES);

  await redis.set(NOTABLE_KEY, JSON.stringify(next));

  // --- FREQUENT FLIERS ---
  const DEBOUNCE_MS = 60 * 60 * 1000; // 1 hour — assumes no single flight lingers >1hr

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
    const now = Date.now();

    if (prev) {
      if (now - prev.lastCountedAt > DEBOUNCE_MS) {
        prev.count += 1;
        prev.lastCountedAt = now;
        prev.airline = f.op || prev.airline || "—";
        prev.lastSeen = now;
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
    .slice(0, MAX_FREQUENT_FLIERS);

  await redis.set(FREQUENT_FLIERS_KEY, JSON.stringify(nextFF));

  // --- LATEST FLIGHTS ---
  await redis.set(
    "latest-flights",
    JSON.stringify({
      receivedAt: Date.now(),
      data: payload,
    }),
    "EX",
    180
  );

  return res.status(200).send("OK");
}