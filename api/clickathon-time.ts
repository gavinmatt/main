import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const TIME_KEY = "clickathon:time-wasted-seconds";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === "GET") {
    try {
      const seconds = Number((await redis.get(TIME_KEY)) ?? 0);
      return res.status(200).json({ seconds });
    } catch (err) {
      console.error("clickathon-time read failed", err);
      return res.status(500).json({ error: "Failed to read time total" });
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

  const seconds = payload?.seconds;
  if (!Number.isFinite(seconds) || !Number.isInteger(seconds) || seconds <= 0) {
    return res.status(400).send("Invalid seconds");
  }

  try {
    const total = await redis.incrby(TIME_KEY, seconds);
    return res.status(200).json({ seconds: total, applied: seconds });
  } catch (err) {
    console.error("clickathon-time write failed", err);
    return res.status(500).json({ error: "Failed to record time" });
  }
}
