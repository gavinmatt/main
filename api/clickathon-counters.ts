import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const KEYS = {
  clicks: "clickathon:total",
  time: "clickathon:time-wasted-seconds",
  shareArrivals: "clickathon:share-arrivals",
} as const;

type CounterType = keyof typeof KEYS;

function isCounterType(value: unknown): value is CounterType {
  return value === "clicks" || value === "time" || value === "shareArrivals";
}

// Heartbeat-based presence: members are player ids, scores are last-seen
// epoch ms. Read prunes anything older than the window, so the set is
// self-cleaning without a separate cron job.
const PRESENCE_KEY = "clickathon:presence:v1";
const PRESENCE_WINDOW_MS = 25_000;
const PLAYER_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === "GET") {
    if (req.query.type === "presence") {
      try {
        const cutoff = Date.now() - PRESENCE_WINDOW_MS;
        await redis.zremrangebyscore(PRESENCE_KEY, "-inf", cutoff);
        const count = await redis.zcard(PRESENCE_KEY);
        return res.status(200).json({ count });
      } catch (err) {
        console.error("clickathon-counters presence read failed", err);
        return res.status(500).json({ error: "Failed to read presence" });
      }
    }

    const type = req.query.type;
    if (!isCounterType(type)) {
      return res.status(400).send("Invalid type");
    }
    try {
      const value = Number((await redis.get(KEYS[type])) ?? 0);
      const body =
        type === "clicks"
          ? { total: value }
          : type === "time"
            ? { seconds: value }
            : { count: value };
      return res.status(200).json(body);
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

  if (payload?.type === "presence") {
    const playerId = String(payload?.playerId ?? "").trim();
    if (!PLAYER_ID_RE.test(playerId)) {
      return res.status(400).send("Invalid player id");
    }
    try {
      await redis.zadd(PRESENCE_KEY, Date.now(), playerId);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("clickathon-counters presence write failed", err);
      return res.status(500).json({ error: "Failed to record presence" });
    }
  }

  const type = payload?.type;
  if (!isCounterType(type)) {
    return res.status(400).send("Invalid type");
  }

  const amount =
    type === "clicks"
      ? payload?.delta
      : type === "time"
        ? payload?.seconds
        : payload?.delta;
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return res.status(400).send("Invalid amount");
  }

  try {
    const total = await redis.incrby(KEYS[type], amount);
    const body =
      type === "clicks"
        ? { total, applied: amount }
        : type === "time"
          ? { seconds: total, applied: amount }
          : { count: total, applied: amount };
    return res.status(200).json(body);
  } catch (err) {
    console.error("clickathon-counters write failed", err);
    return res.status(500).json({ error: "Failed to record" });
  }
}
