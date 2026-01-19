import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  try {
    const raw = await redis.get('latest-flights');

    if (!raw) {
      return res.status(204).end();
    }

    const data = JSON.parse(raw);

    return res.status(200).json({
      receivedAt: data.receivedAt,
      count: data.data.count,
      aircraft: data.data.aircraft
    });
  } catch (err) {
    console.error('Redis read failed', err);
    return res.status(500).send('Redis read failed');
  }
}
