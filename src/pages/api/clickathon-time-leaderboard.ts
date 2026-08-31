import type { APIRoute } from "astro";
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not configured");
}

const redis = new Redis(process.env.REDIS_URL);

const LEADERBOARD_KEY = "clickathon:time-leaderboard:v1";
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const requestedLimit = parseInt(url.searchParams.get("limit") ?? "", 10);
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

    const queryInitials = (url.searchParams.get("initials") ?? "")
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

    return json({ entries, you });
  } catch (err) {
    console.error("clickathon-time-leaderboard read failed", err);
    return json({ error: "Failed to read leaderboard" }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const initials = String(payload?.initials ?? "")
    .trim()
    .toUpperCase();
  const score = payload?.score;

  if (!INITIALS_RE.test(initials) || BLOCKED_INITIALS.has(initials)) {
    return new Response("Invalid initials", { status: 400 });
  }
  if (!Number.isFinite(score) || !Number.isInteger(score) || score <= 0) {
    return new Response("Invalid score", { status: 400 });
  }

  try {
    const changed = await redis.zadd(
      LEADERBOARD_KEY,
      "GT",
      "CH",
      score,
      initials
    );
    return json({ updated: changed === 1 });
  } catch (err) {
    console.error("clickathon-time-leaderboard write failed", err);
    return json({ error: "Failed to submit score" }, 500);
  }
};
