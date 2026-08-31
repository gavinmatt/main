import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const LEADERBOARD_KEY = "clickathon:leaderboard:v1";
const TOP_N = 25;
const MAX_LIMIT = 5000;
const INITIALS_RE = /^[A-Z]{3}$/;

// Slurs and hate symbols only — mild profanity (e.g. ASS) is fine.
const BLOCKED_INITIALS = new Set([
  "FAG",
  "DYK",
  "NIG",
  "COO",
  "WOP",
  "JAP",
  "KYK",
  "KKK",
  "NAZ",
  "KYS",
]);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === "GET") {
    try {
      const requestedLimit = parseInt(String(req.query.limit ?? ""), 10);
      const limit =
        Number.isFinite(requestedLimit) && requestedLimit > 0
          ? Math.min(requestedLimit, MAX_LIMIT)
          : TOP_N;
      const raw = await redis.zrevrange(
        LEADERBOARD_KEY,
        0,
        limit - 1,
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
      console.error("clickathon-leaderboard read failed", err);
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

  if (!INITIALS_RE.test(initials) || BLOCKED_INITIALS.has(initials)) {
    return res.status(400).send("Invalid initials");
  }
  if (!Number.isFinite(score) || !Number.isInteger(score) || score <= 0) {
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
    console.error("clickathon-leaderboard write failed", err);
    return res.status(500).json({ error: "Failed to submit score" });
  }
}
