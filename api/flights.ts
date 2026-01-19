import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

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

  return res.status(200).json({
    receivedAt: parsed.receivedAt,
    count: parsed.data.count,
    aircraft: parsed.data.aircraft
  });
}
