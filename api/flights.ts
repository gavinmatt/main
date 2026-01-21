import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

const NOTABLE_KEY = 'notable-pings:v1';
const MAX_NOTABLES = 10;

const RX_LAT = 48.415;
const RX_LON = -114.459;

function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  const raw = await redis.get('latest-flights');

  if (!raw) {
    return res.status(204).end();
  }

  const parsed = JSON.parse(raw);
  const aircraft = parsed.data.aircraft ?? [];

  /* ---------- UPDATE NOTABLE PINGS ---------- */

  const existingRaw = (await redis.get(NOTABLE_KEY)) ?? '[]';
  let notables: any[];

  try {
    notables = JSON.parse(existingRaw);
  } catch {
    notables = [];
  }

  const byHex = new Map(notables.map((n: any) => [n.hex, n]));

  for (const f of aircraft) {
    if (!f.hex || f.lat == null || f.lon == null) continue;

    const d = Math.round(
      distanceNm(RX_LAT, RX_LON, f.lat, f.lon)
    );

    const prev = byHex.get(f.hex);

    if (!prev || d > prev.maxDistance) {
      byHex.set(f.hex, {
        hex: f.hex,
        airline: f.op || '—',
        callsign: (f.flight || '').trim() || 'NO CALLSIGN',
        maxDistance: d,
        lastSeen: Date.now()
      });
    }
  }

  const next = [...byHex.values()]
    .sort((a, b) => b.maxDistance - a.maxDistance)
    .slice(0, MAX_NOTABLES);

  if (next.length) {
    await redis.set(NOTABLE_KEY, JSON.stringify(next));
  }

  /* ---------- RETURN LIVE DATA ---------- */

  return res.status(200).json({
    receivedAt: parsed.receivedAt,
    count: parsed.data.count,
    aircraft
  });
}
