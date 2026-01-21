import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

const NOTABLE_KEY = 'notable-pings:v1';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  let rows: any[];

  try {
    const raw = (await redis.get(NOTABLE_KEY)) ?? '[]';
    rows = JSON.parse(raw);
  } catch {
    rows = [];
  }

  return res.status(200).json({ rows });
}
