import type { APIRoute } from "astro";
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const TIME_KEY = "clickathon:time-wasted-seconds";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async () => {
  try {
    const seconds = Number((await redis.get(TIME_KEY)) ?? 0);
    return json({ seconds });
  } catch (err) {
    console.error("clickathon-time read failed", err);
    return json({ error: "Failed to read time total" }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const seconds = payload?.seconds;
  if (!Number.isFinite(seconds) || !Number.isInteger(seconds) || seconds <= 0) {
    return new Response("Invalid seconds", { status: 400 });
  }

  try {
    const total = await redis.incrby(TIME_KEY, seconds);
    return json({ seconds: total, applied: seconds });
  } catch (err) {
    console.error("clickathon-time write failed", err);
    return json({ error: "Failed to record time" }, 500);
  }
};
