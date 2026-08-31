import type { APIRoute } from "astro";
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const TOTAL_KEY = "clickathon:total";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async () => {
  try {
    const total = Number((await redis.get(TOTAL_KEY)) ?? 0);
    return json({ total });
  } catch (err) {
    console.error("clickathon-clicks read failed", err);
    return json({ error: "Failed to read click total" }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const delta = payload?.delta;
  if (!Number.isFinite(delta) || !Number.isInteger(delta) || delta <= 0) {
    return new Response("Invalid delta", { status: 400 });
  }

  try {
    const total = await redis.incrby(TOTAL_KEY, delta);
    return json({ total, applied: delta });
  } catch (err) {
    console.error("clickathon-clicks write failed", err);
    return json({ error: "Failed to record clicks" }, 500);
  }
};
