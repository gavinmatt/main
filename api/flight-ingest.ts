import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  // Store latest snapshot (memory only)
  globalThis.__LATEST_FLIGHTS__ = {
    receivedAt: Date.now(),
    data: payload
  };

  return res.status(200).send('OK');
}
