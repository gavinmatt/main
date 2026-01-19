import type { APIRoute } from "astro";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: import.meta.env.REDIS_URL!,
  token: import.meta.env.REDIS_TOKEN!
});

export const GET: APIRoute = async () => {
  const keys = await redis.keys("aircraft:*");

  if (!keys.length) {
    return new Response(null, { status: 204 });
  }

  const aircraft = (await redis.mget<any>(keys))
    .filter(Boolean)
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt);

  return new Response(
    JSON.stringify({
      receivedAt: Date.now(),
      aircraft
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
