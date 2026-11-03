import type { VercelRequest, VercelResponse } from './_vercel.js';
import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not configured');
}

const redis = new Redis(process.env.REDIS_URL);

const NOTABLE_KEY = 'notable-pings:v1';
const DAILY_RANGE_KEY = 'range:daily'; // must match flight-ingest.ts
const RANGE_WINDOW_DAYS = 30;

// The receiver's typical reach: the median of each day's longest reception over the
// last 30 days, leaving out today while it's still partial. Tracks antenna changes.
async function typicalRange() {
  const raw = await redis.zrange(DAILY_RANGE_KEY, 0, -1, 'WITHSCORES');
  const mtDay = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Denver' });
  const today = mtDay(Date.now());
  const cutoff = mtDay(Date.now() - RANGE_WINDOW_DAYS * 86400000);
  const days: { day: string; nm: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) days.push({ day: raw[i], nm: Number(raw[i + 1]) });
  const recent = days.filter((d) => d.day >= cutoff);
  const complete = recent.filter((d) => d.day !== today);
  const pool = (complete.length ? complete : recent).map((d) => d.nm).sort((a, b) => a - b);
  if (!pool.length) return null;
  const mid = Math.floor(pool.length / 2);
  return Math.round(pool.length % 2 ? pool[mid] : (pool[mid - 1] + pool[mid]) / 2);
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
    const [raw, typical] = await Promise.all([redis.get(NOTABLE_KEY), typicalRange()]);
    const rows = raw ? JSON.parse(raw) : [];
    return res.status(200).json({ rows, typicalRange: typical });
  } catch (err) {
    console.error('notable-pings read failed', err);
    return res.status(500).json({
      error: 'Failed to read notable pings'
    });
  }
}
