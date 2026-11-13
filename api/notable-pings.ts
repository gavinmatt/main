import type { VercelRequest, VercelResponse } from './_vercel.js';
import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not configured');
}

const redis = new Redis(process.env.REDIS_URL);

const NOTABLE_KEY = 'notable-pings:v1';
const DAILY_RANGE_KEY = 'range:daily'; // must match flight-ingest.ts
const HIGHEST_KEY = 'records:highest:v2'; // must match flight-ingest.ts
const FASTEST_KEY = 'records:fastest:v1'; // must match flight-ingest.ts
const RANGE_WINDOW_DAYS = 30;
const COVERAGE_SECTOR_DEG = 10; // must match flight-ingest.ts

// Mountain Time calendar date as YYYY-MM-DD, as ingest keys its daily sets.
const mtDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

// How far the receiver reaches on its recent days: each day's longest valid reception
// over the last 30 days, leaving out today while it's still partial. Tracks antenna
// changes, so the ratings stay meaningful after a move.
async function rangeStats() {
  const raw = await redis.zrange(DAILY_RANGE_KEY, 0, -1, 'WITHSCORES');
  const today = mtDay(Date.now());
  const cutoff = mtDay(Date.now() - RANGE_WINDOW_DAYS * 86400000);
  const maxes: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    if (raw[i] >= cutoff && raw[i] !== today) maxes.push(Number(raw[i + 1]));
  }
  maxes.sort((a, b) => a - b);
  if (!maxes.length) return { days: 0 };
  // Interpolated between days, so with only a couple of weeks the 90th percentile isn't
  // simply the best day.
  const pct = (p: number) => {
    const pos = p * (maxes.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, maxes.length - 1);
    return Math.round(maxes[lo] + (maxes[hi] - maxes[lo]) * (pos - lo));
  };
  const median = pct(0.5);
  const best = maxes[maxes.length - 1];
  // Each tier strictly above the last, so no two ratings share a threshold.
  const p90 = Math.max(median + 1, Math.min(pct(0.9), best - 1));
  return { days: maxes.length, median, p90, best: Math.max(best, p90 + 1) };
}

// Records from before ingest kept a bearing: recover it from that day's coverage rose,
// where the record is the furthest ping in its 10° sector unless another plane beat it.
async function fillBearings(rows: any[]) {
  const missing = rows.filter((r) => r.bearing == null);
  if (!missing.length) return;
  const pipeline = redis.pipeline();
  for (const r of missing) pipeline.zrange(`cov:${mtDay(r.lastSeen)}`, 0, -1, 'WITHSCORES');
  const results = (await pipeline.exec()) ?? [];
  missing.forEach((r, i) => {
    const raw = (results[i]?.[1] as string[] | null) ?? [];
    const sectors: number[] = [];
    for (let j = 0; j < raw.length; j += 2) {
      if (Number(raw[j + 1]) === r.maxDistance) sectors.push(Number(raw[j]));
    }
    if (sectors.length === 1) r.bearing = sectors[0] * COVERAGE_SECTOR_DEG + COVERAGE_SECTOR_DEG / 2;
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  // Ingest updates this once per batch; a minute of CDN cache is plenty.
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  try {
    const [raw, range, highest, fastest] = await Promise.all([
      redis.get(NOTABLE_KEY),
      rangeStats(),
      redis.get(HIGHEST_KEY),
      redis.get(FASTEST_KEY),
    ]);
    const rows = raw ? JSON.parse(raw) : [];
    await fillBearings(rows);
    return res.status(200).json({
      rows,
      range,
      highest: highest ? JSON.parse(highest) : [],
      fastest: fastest ? JSON.parse(fastest) : [],
    });
  } catch (err) {
    console.error('notable-pings read failed', err);
    return res.status(500).json({
      error: 'Failed to read notable pings'
    });
  }
}
