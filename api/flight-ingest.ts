import type { APIRoute } from "astro";
import Redis from "ioredis";

const TTL_SECONDS = 120;

export const POST: APIRoute = async ({ request }) => {
  try {
    const redis = new Redis(process.env.REDIS_URL!);

    const secret =
      request.headers.get("x-flight-secret") ??
      request.headers.get("X-Flight-Secret");

    if (!secret || secret !== process.env.FLIGHT_INGEST_SECRET) {
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
      const existingRaw = await redis.get(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};

      const merged = {
        ...existing,
        ...Object.fromEntries(
          Object.entries(ac).filter(
            ([, v]) => v !== null && v !== undefined
          )
        ),
        lastSeenAt: now
      };

      await redis.set(key, JSON.stringify(merged), "EX", TTL_SECONDS);
    }

    return new Response("OK", { status: 200 });
  } catch {
    return new Respnse("Internal Server Error", { status: 500 });
  }
};
