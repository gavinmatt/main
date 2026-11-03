import type { VercelRequest, VercelResponse } from "./_vercel.js";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const WINDOW_DAYS = 90;
const TYPES = ["all", "airline", "private", "military", "heli", "skydive"];
const SCOPES = ["any", "near"];

const zeroGrid = () => Array.from({ length: 7 }, () => new Array(24).fill(0));

// Mountain Time calendar date `days` before now, as YYYY-MM-DD.
function mtDay(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  // Ingest updates the counts every batch, but averages over 90 days barely move.
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  // A Set, since stepping back 24h across a DST change can land on the same date twice.
  const days = [...new Set(Array.from({ length: WINDOW_DAYS }, (_, i) => mtDay(i)))];
  const pipeline = redis.pipeline();
  for (const day of days) pipeline.hgetall(`hmd:${day}`);
  const results = (await pipeline.exec()) ?? [];

  const sums: Record<string, number[][]> = {};
  for (const t of TYPES) for (const s of SCOPES) sums[`${t}|${s}`] = zeroGrid();
  const airlines = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => new Map<string, number>())
  );
  const daysPerWeekday = new Array(7).fill(0);
  let since: string | null = null;

  days.forEach((day, i) => {
    const hash = results[i]?.[1] as Record<string, string> | null;
    if (!hash || !Object.keys(hash).length) return;
    // Noon avoids any DST edge when reading the weekday back.
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    daysPerWeekday[weekday] += 1;
    since = day;
    for (const [field, value] of Object.entries(hash)) {
      const [hourStr, kind, scope] = field.split("|");
      const hour = Number(hourStr);
      const n = Number(value);
      if (kind.startsWith("op:")) {
        const cell = airlines[weekday][hour];
        const name = kind.slice(3);
        cell.set(name, (cell.get(name) ?? 0) + n);
      } else if (sums[`${kind}|${scope}`]) {
        sums[`${kind}|${scope}`][weekday][hour] += n;
      }
    }
  });

  // Average per day, so a weekday with fewer days of data isn't drawn lighter.
  const grids: Record<string, number[][]> = {};
  for (const [key, grid] of Object.entries(sums)) {
    grids[key] = grid.map((row, d) =>
      row.map((v) => (daysPerWeekday[d] ? Math.round((v / daysPerWeekday[d]) * 10) / 10 : 0))
    );
  }
  const topAirline = airlines.map((row) =>
    row.map((cell) => [...cell.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
  );

  return res.status(200).json({ grids, topAirline, since, daysPerWeekday });
}
