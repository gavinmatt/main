import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-flight-secret');

  if (!secret || secret !== import.meta.env.FLIGHT_INGEST_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return new Response('Invalid content type', { status: 400 });
  }

  const payload = await request.json();

  // Minimal validation
  if (!payload || !Array.isArray(payload.aircraft)) {
    return new Response('Invalid payload', { status: 400 });
  }

  // TEMP: store in global memory (Step 15 will improve this)
  globalThis.__LATEST_FLIGHTS__ = {
    receivedAt: Date.now(),
    data: payload
  };

  return new Response('OK', { status: 200 });
};
