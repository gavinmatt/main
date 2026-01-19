import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response('OK', { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
  const secret =
    request.headers.get('x-flight-secret') ??
    request.headers.get('X-Flight-Secret');

  if (!secret || secret !== import.meta.env.FLIGHT_INGEST_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return new Response('Invalid content type', { status: 400 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!payload || !Array.isArray(payload.aircraft)) {
    return new Response('Invalid payload', { status: 400 });
  }

  globalThis.__LATEST_FLIGHTS__ = {
    receivedAt: Date.now(),
    data: payload
  };

  return new Response('OK', { status: 200 });
};
