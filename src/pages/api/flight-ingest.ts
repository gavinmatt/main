import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const headerSecret =
    request.headers.get('x-flight-secret') ??
    request.headers.get('X-Flight-Secret');

  const envSecret = import.meta.env.FLIGHT_INGEST_SECRET;

  // DIAGNOSTIC BLOCK (temporary)
  if (!headerSecret || !envSecret) {
    return new Response(
      JSON.stringify({
        error: 'missing secret',
        headerPresent: !!headerSecret,
        envPresent: !!envSecret
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  if (headerSecret !== envSecret) {
    return new Response(
      JSON.stringify({
        error: 'mismatch',
        headerLength: headerSecret.length,
        envLength: envSecret.length
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  // END DIAGNOSTIC BLOCK

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return new Response('Invalid content type', { status: 400 });
  }

  const payload = await request.json();

  if (!payload || !Array.isArray(payload.aircraft)) {
    return new Response('Invalid payload', { status: 400 });
  }

  globalThis.__LATEST_FLIGHTS__ = {
    receivedAt: Date.now(),
    data: payload
  };

  return new Response('OK', { status: 200 });
};
