import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  const data = (globalThis as any).__LATEST_FLIGHTS__;

  if (!data) {
    return res.status(204).end(); // no data yet
  }

  return res.status(200).json({
    receivedAt: data.receivedAt,
    count: data.data.count,
    aircraft: data.data.aircraft
  });
}
