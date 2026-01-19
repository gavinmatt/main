import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: import.meta.env.REDIS_URL!,
  token: import.meta.env.REDIS_TOKEN!
});

const TTL_SECONDS = 120;

export const POST: APIRoute = async ({ request }) => {
  const secret =
    request.headers.get("x-flight-secret") ??
    request.headers.get("X-Flight-Secret");

  if (!secret || secret !== import.meta.env.FLIGHT_INGEST_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json();
  if (!Array.isArray(payload.aircraft)) {
    return new Response("Invalid payload", { status: 400 });
  }

  const now = Date.now();

  for (const ac of payload.aircraft) {
    if (!ac.hex) continue;

    const key = `aircraft:${ac.hex}`;
    const existing = await redis.get<any>(key);

    const merged = {
      ...(existing || {}),
      ...Object.fromEntries(
        Object.entries(ac).filter(
          ([, v]) => v !== null && v !== undefined
        )
      ),
      lastSeenAt: now
    };

    await redis.set(key, merged, { ex: TTL_SECONDS });
  }

  return new Response("OK", { status: 200 });
};
