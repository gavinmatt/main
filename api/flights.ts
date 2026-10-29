import type { VercelRequest, VercelResponse } from './_vercel.js';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

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

  /* ---------- ATTACH TRAILS AND LAST KNOWN CALLSIGNS ---------- */

  const withHex = aircraft.filter((f: any) => f.hex);
  const pipeline = redis.pipeline();
  for (const f of withHex) {
    pipeline.lrange(`trail:${f.hex}`, 0, -1);
    pipeline.get(`callsign:${f.hex}`);
  }
  const results = (await pipeline.exec()) ?? [];
  withHex.forEach((f: any, i: number) => {
    const [trailErr, points] = results[2 * i] as [Error | null, string[] | null];
    if (!trailErr && points?.length) {
      f.trail = points.map((p) => p.split(",").map(Number));
    }
    const [csErr, lastCallsign] = results[2 * i + 1] as [Error | null, string | null];
    const cs = (f.flight || "").trim();
    if (!csErr && lastCallsign && (!cs || cs === "00000000")) {
      f.flight = lastCallsign;
    }
  });

  /* ---------- RETURN LIVE DATA ---------- */

  return res.status(200).json({
    receivedAt: parsed.receivedAt,
    count: parsed.data.count,
    aircraft,
  });
}