import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const KEYS = {
  clicks: "clickathon:total",
  time: "clickathon:time-wasted-seconds",
} as const;

type CounterType = keyof typeof KEYS;

function isCounterType(value: unknown): value is CounterType {
  return value === "clicks" || value === "time";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === "GET") {
    const type = req.query.type;
    if (!isCounterType(type)) {
      return res.status(400).send("Invalid type");
    }
    try {
      const value = Number((await redis.get(KEYS[type])) ?? 0);
      return res
        .status(200)
        .json(type === "clicks" ? { total: value } : { seconds: value });
    } catch (err) {
      console.error("clickathon-counters read failed", err);
      return res.status(500).json({ error: "Failed to read counter" });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  let payload: any;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).send("Invalid JSON");
  }

  const type = payload?.type;
  if (!isCounterType(type)) {
    return res.status(400).send("Invalid type");
  }

  const amount = type === "clicks" ? payload?.delta : payload?.seconds;
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return res.status(400).send("Invalid amount");
  }

  try {
    const total = await redis.incrby(KEYS[type], amount);
    return res
      .status(200)
      .json(
        type === "clicks"
          ? { total, applied: amount }
          : { seconds: total, applied: amount }
      );
  } catch (err) {
    console.error("clickathon-counters write failed", err);
    return res.status(500).json({ error: "Failed to record" });
  }
}
