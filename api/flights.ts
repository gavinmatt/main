import type { APIRoute } from "astro";
import Redis from "ioredis";

export const GET: APIRoute = async () => {
  try {
    const redis = new Redis(process.env.REDIS_URL!);

    const keys = await redis.keys("aircraft:*");
    if (!keys.length) {
      return new Response(null, { status: 204 });
    }

    const values = await redis.mget(...keys);
    const aircraft = values
      .filter(Boolean)
      .map(v => JSON.parse(v!))
      .sort((a, b) => (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0));

    return new Response(
      JSON.stringify({ receivedAt: Date.now(), aircraft }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
};
