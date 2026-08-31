import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const KEYS = {
  total: "clickathon:leaderboard:v1",
  cps: "clickathon:cps-leaderboard:v1",
  time: "clickathon:time-leaderboard:v1",
} as const;

// Maps a player's persistent client-side id (the sorted set member) to
// their currently-saved initials. Members created before this map existed
// have no entry here, so they're displayed using the member itself, which
// for legacy rows is the initials string (that used to be the member).
const INITIALS_HASH_KEY = "clickathon:player-initials:v1";

type BoardType = keyof typeof KEYS;

function isBoardType(value: unknown): value is BoardType {
  return value === "total" || value === "cps" || value === "time";
}

const TOP_N = 25;
const MAX_LIMIT = 5000;
const INITIALS_RE = /^[A-Z]{3}$/;
const PLAYER_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

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
    const board = req.query.board;
    if (!isBoardType(board)) {
      return res.status(400).send("Invalid board");
    }
    const key = KEYS[board];
    try {
      const requestedLimit = parseInt(String(req.query.limit ?? ""), 10);
      const limit =
        Number.isFinite(requestedLimit) && requestedLimit > 0
          ? Math.min(requestedLimit, MAX_LIMIT)
          : TOP_N;
      const raw = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");
      const members: string[] = [];
      const scores: number[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        members.push(raw[i]);
        scores.push(Number(raw[i + 1]));
      }
      const resolvedInitials = members.length
        ? await redis.hmget(INITIALS_HASH_KEY, ...members)
        : [];
      const entries = members.map((member, i) => ({
        id: member,
        // Legacy rows (created before player ids existed) used the
        // initials themselves as the member, so falling back to the
        // member is correct for them too.
        initials: resolvedInitials[i] ?? member,
        score: scores[i],
      }));

      const playerId = String(req.query.playerId ?? "").trim();
      let you: { rank: number; score: number } | null = null;
      if (PLAYER_ID_RE.test(playerId)) {
        const rank = await redis.zrevrank(key, playerId);
        if (rank != null) {
          const score = await redis.zscore(key, playerId);
          you = { rank: rank + 1, score: Number(score) };
        }
      }

      return res.status(200).json({ entries, you });
    } catch (err) {
      console.error("clickathon-leaderboards read failed", err);
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

  const board = payload?.board;
  if (!isBoardType(board)) {
    return res.status(400).send("Invalid board");
  }
  const key = KEYS[board];

  const playerId = String(payload?.playerId ?? "").trim();
  const initials = String(payload?.initials ?? "")
    .trim()
    .toUpperCase();
  const score = payload?.score;

  if (!PLAYER_ID_RE.test(playerId)) {
    return res.status(400).send("Invalid player id");
  }
  if (!INITIALS_RE.test(initials) || BLOCKED_INITIALS.has(initials)) {
    return res.status(400).send("Invalid initials");
  }
  if (!Number.isFinite(score) || !Number.isInteger(score) || score <= 0) {
    return res.status(400).send("Invalid score");
  }

  try {
    const [changed] = await Promise.all([
      redis.zadd(key, "GT", "CH", score, playerId),
      redis.hset(INITIALS_HASH_KEY, playerId, initials),
    ]);
    return res.status(200).json({ updated: changed === 1 });
  } catch (err) {
    console.error("clickathon-leaderboards write failed", err);
    return res.status(500).json({ error: "Failed to submit score" });
  }
}
