import type { VercelRequest, VercelResponse } from "./_vercel.js";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const WINDOW_DAYS = 90;
const MAX_FREQUENT_FLIERS_SERVED = 10;

// Mountain Time calendar date `daysAgo` before now, as YYYY-MM-DD.
function mtDay(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400000).toLocaleDateString("en-CA", {
    timeZone: "America/Denver",
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  // Totals over 90 days barely move minute to minute.
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  // A Set, since stepping back 24h across a DST change can land on the same date twice.
  const days = [...new Set(Array.from({ length: WINDOW_DAYS }, (_, i) => mtDay(i)))];
  const pipeline = redis.pipeline();
  for (const day of days) pipeline.hgetall(`ffd:${day}`);
  const results = (await pipeline.exec()) ?? [];

  // Each day's hash maps callsign -> hours seen that day.
  const totals = new Map<string, { count: number; lastDay: string }>();
  let since: string | null = null;
  days.forEach((day, i) => {
    const hash = results[i]?.[1] as Record<string, string> | null;
    if (!hash || !Object.keys(hash).length) return;
    since = day;
    for (const [callsign, hours] of Object.entries(hash)) {
      const t = totals.get(callsign) ?? { count: 0, lastDay: day };
      t.count += Number(hours);
      // Days run newest first, so the first one seen is the latest.
      totals.set(callsign, t);
    }
  });

  const rows = [...totals.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].lastDay.localeCompare(a[1].lastDay))
    .slice(0, MAX_FREQUENT_FLIERS_SERVED)
    .map(([callsign, t]) => ({ callsign, count: t.count, lastDay: t.lastDay }));

  return res.status(200).json({ rows, since });
}
