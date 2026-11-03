import type { VercelRequest, VercelResponse } from './_vercel.js';
import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not configured');
}

const redis = new Redis(process.env.REDIS_URL);

const NOTABLE_KEY = 'notable-pings:v1';
const DAILY_RANGE_KEY = 'range:daily'; // must match flight-ingest.ts
const RANGE_WINDOW_DAYS = 30;

// How far the receiver reaches on its recent days: each day's longest valid reception
// over the last 30 days, leaving out today while it's still partial. Tracks antenna
// changes, so the ratings stay meaningful after a move.
async function rangeStats() {
  const raw = await redis.zrange(DAILY_RANGE_KEY, 0, -1, 'WITHSCORES');
  const mtDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
  const today = mtDay(Date.now());
  const cutoff = mtDay(Date.now() - RANGE_WINDOW_DAYS * 86400000);
  const maxes: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    if (raw[i] >= cutoff && raw[i] !== today) maxes.push(Number(raw[i + 1]));
  }
  maxes.sort((a, b) => a - b);
  if (!maxes.length) return { days: 0 };
  const pct = (p: number) => maxes[Math.min(maxes.length - 1, Math.floor(p * maxes.length))];
  return { days: maxes.length, median: pct(0.5), p90: pct(0.9), best: maxes[maxes.length - 1] };
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
    const [raw, range] = await Promise.all([redis.get(NOTABLE_KEY), rangeStats()]);
    const rows = raw ? JSON.parse(raw) : [];
    return res.status(200).json({ rows, range });
  } catch (err) {
    console.error('notable-pings read failed', err);
    return res.status(500).json({
      error: 'Failed to read notable pings'
    });
  }
}
