import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not configured');
}

const redis = new Redis(process.env.REDIS_URL);

const NOTABLE_KEY = 'notable-pings:v1';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const raw = await redis.get(NOTABLE_KEY);

    if (!raw) {
      return res.status(200).json({ rows: [] });
    }

    const rows = JSON.parse(raw);
    return res.status(200).json({ rows });
  } catch (err) {
    console.error('notable-pings read failed', err);
    return res.status(500).json({
      error: 'Failed to read notable pings'
    });
  }
}
