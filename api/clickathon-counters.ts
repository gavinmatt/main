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
  cheatersCaught: "clickathon:cheaters-caught",
} as const;

type CounterType = keyof typeof KEYS;

function isCounterType(value: unknown): value is CounterType {
  return (
    value === "clicks" ||
    value === "time" ||
    value === "shareArrivals" ||
    value === "cheatersCaught"
  );
}

// Heartbeat-based presence: members are player ids, scores are last-seen
// epoch ms. Read prunes anything older than the window, so the set is
// self-cleaning without a separate cron job.
const PRESENCE_KEY = "clickathon:presence:v1";
const PRESENCE_WINDOW_MS = 25_000;
const PLAYER_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

// Not real anti-abuse -- there's no auth here and there isn't going to be,
// and this is trivially bypassed with `curl -A "Mozilla/5.0 ..."`. Goal is
// "semi functional but really irritating," not a hard wall: real browsers
// always send a "Mozilla/5.0" token (a legacy convention every browser
// still follows), so anything without it is almost certainly curl/Postman/
// a script, not a player. Those pay a random multi-second latency tax on
// every single request, and still have a coin-flip chance of getting
// bounced with a silly error after waiting -- so it mostly still works,
// just painfully slowly and unpredictably. Real browser traffic skips the
// delay and only gets the occasional (1-in-10) chaos error for fun; either
// way a dropped request just quietly retries on the client's next cycle.
function looksLikeBrowser(userAgent: string): boolean {
  return /Mozilla\/\d/.test(userAgent);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const AUTOMATED_DELAY_MIN_MS = 1500;
const AUTOMATED_DELAY_MAX_MS = 6000;
const AUTOMATED_ERROR_RATE = 0.5;

const CHAOS_COUNTER_KEY = "clickathon:counters-post-chaos-counter";
const CHAOS_EVERY_N = 10;
const CHAOS_ERRORS: { status: number; body: string }[] = [
  { status: 418, body: "418 I'm a teapot. This endpoint refuses to brew your score." },
  { status: 429, body: "429 Too Many Requests. Slow your roll, speedrunner." },
  {
    status: 503,
    body: "503 Service Unavailable. The hamster powering this server needed a snack break.",
  },
  { status: 420, body: "420 Enhance Your Calm." },
  { status: 402, body: "402 Payment Required. Clicks aren't free, apparently." },
  {
    status: 451,
    body: "451 Unavailable For Legal Reasons. Your lawyer has been notified.",
  },
  { status: 409, body: "409 Conflict. The universe disagrees with your click count." },
];

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

  const isAutomated = !looksLikeBrowser(String(req.headers["user-agent"] ?? ""));
  if (isAutomated) {
    const delay =
      AUTOMATED_DELAY_MIN_MS +
      Math.random() * (AUTOMATED_DELAY_MAX_MS - AUTOMATED_DELAY_MIN_MS);
    await sleep(delay);
  }
  try {
    const requestCount = await redis.incr(CHAOS_COUNTER_KEY);
    const shouldChaos =
      (isAutomated && Math.random() < AUTOMATED_ERROR_RATE) ||
      requestCount % CHAOS_EVERY_N === 0;
    if (shouldChaos) {
      const chaosError =
        CHAOS_ERRORS[Math.floor(Math.random() * CHAOS_ERRORS.length)];
      return res.status(chaosError.status).send(chaosError.body);
    }
  } catch (err) {
    // Don't let the chaos counter itself block a real write.
    console.error("clickathon-counters chaos counter failed", err);
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
