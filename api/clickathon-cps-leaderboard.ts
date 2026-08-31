import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const LEADERBOARD_KEY = "clickathon:cps-leaderboard:v1";
const TOP_N = 25;
const MAX_SCORE = 100; // no human clicks 100x/sec
const INITIALS_RE = /^[A-Z]{3}$/;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === "GET") {
    try {
      const raw = await redis.zrevrange(
        LEADERBOARD_KEY,
        0,
        TOP_N - 1,
        "WITHSCORES"
      );
      const entries: { initials: string; score: number }[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({ initials: raw[i], score: Number(raw[i + 1]) });
      }

      const queryInitials = String(req.query.initials ?? "")
        .trim()
        .toUpperCase();
      let you: { rank: number; score: number } | null = null;
      if (INITIALS_RE.test(queryInitials)) {
        const rank = await redis.zrevrank(LEADERBOARD_KEY, queryInitials);
        if (rank != null) {
          const score = await redis.zscore(LEADERBOARD_KEY, queryInitials);
          you = { rank: rank + 1, score: Number(score) };
        }
      }

      return res.status(200).json({ entries, you });
    } catch (err) {
      console.error("clickathon-cps-leaderboard read failed", err);
      return res.status(500).json({ error: "Failed to read leaderboard" });
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

  const initials = String(payload?.initials ?? "")
    .trim()
    .toUpperCase();
  const score = payload?.score;

  if (!INITIALS_RE.test(initials)) {
    return res.status(400).send("Invalid initials");
  }
  if (
    !Number.isFinite(score) ||
    !Number.isInteger(score) ||
    score <= 0 ||
    score > MAX_SCORE
  ) {
    return res.status(400).send("Invalid score");
  }

  try {
    const changed = await redis.zadd(
      LEADERBOARD_KEY,
      "GT",
      "CH",
      score,
      initials
    );
    return res.status(200).json({ updated: changed === 1 });
  } catch (err) {
    console.error("clickathon-cps-leaderboard write failed", err);
    return res.status(500).json({ error: "Failed to submit score" });
  }
}
