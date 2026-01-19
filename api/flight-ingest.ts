import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const secret =
    req.headers['x-flight-secret'] ||
    req.headers['X-Flight-Secret'];

  if (!secret || secret !== process.env.FLIGHT_INGEST_SECRET) {
    return res.status(401).send('Unauthorized');
  }

  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(400).send('Invalid content type');
  }

  const payload = req.body;

  if (!payload || !Array.isArray(payload.aircraft)) {
    return res.status(400).send('Invalid payload');
  }

  await redis.set('latest-flights', {
    receivedAt: Date.now(),
    data: payload
  }, { ex: 60 }); // auto-expire after 60s (safe for free tier)

  return res.status(200).send('OK');
}
