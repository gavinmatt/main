import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN || ''
});

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  const data = await redis.get<any>('latest-flights');

  if (!data) {
    return res.status(204).end();
  }

  return res.status(200).json({
    receivedAt: data.receivedAt,
    count: data.data.count,
    aircraft: data.data.aircraft
  });
}
