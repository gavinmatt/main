import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const TOTAL_KEY = "clickathon:total";
const MAX_DELTA_PER_FLUSH = 75;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === "GET") {
    try {
      const total = Number((await redis.get(TOTAL_KEY)) ?? 0);
      return res.status(200).json({ total });
    } catch (err) {
      console.error("clickathon-clicks read failed", err);
      return res.status(500).json({ error: "Failed to read click total" });
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

  const delta = payload?.delta;
  if (!Number.isFinite(delta) || !Number.isInteger(delta) || delta <= 0) {
    return res.status(400).send("Invalid delta");
  }

  const applied = Math.min(delta, MAX_DELTA_PER_FLUSH);
  if (applied < delta) {
    console.warn(`clickathon-clicks clamped delta ${delta} -> ${applied}`);
  }

  try {
    const total = await redis.incrby(TOTAL_KEY, applied);
    return res.status(200).json({ total, applied });
  } catch (err) {
    console.error("clickathon-clicks write failed", err);
    return res.status(500).json({ error: "Failed to record clicks" });
  }
}
