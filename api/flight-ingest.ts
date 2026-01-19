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

  let payload: any;

  try {
    payload =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body;
  } catch {
    return res.status(400).send('Invalid JSON');
  }

  if (!payload || !Array.isArray(payload.aircraft)) {
    return res.status(400).send('Invalid payload');
  }

  await redis.set(
    'latest-flights',
    JSON.stringify({
      receivedAt: Date.now(),
      data: payload
    }),
    'EX',
    180
  );

  return res.status(200).send('OK');
}
