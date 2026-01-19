import type { VercelRequest, VercelResponse } from '@vercel/node';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

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

  try {
    await redis.set(
      'latest-flights',
      JSON.stringify({
        receivedAt: Date.now(),
        data: payload
      }),
      'EX',
      60
    );

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Redis write failed', err);
    return res.status(500).send('Redis write failed');
  }
}
