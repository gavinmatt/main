import type { VercelRequest, VercelResponse } from "./_vercel.js";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// Must match the sector size ingest writes with.
const SECTOR_DEG = 10;
const SECTORS = 360 / SECTOR_DEG;
const WINDOWS = [7, 30, 90];

// Mountain Time calendar date `days` before now, as YYYY-MM-DD.
function mtDay(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Denver" });
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  // Newest first. A Set, since stepping back 24h across a DST change can repeat a date.
  const days = [...new Set(Array.from({ length: Math.max(...WINDOWS) }, (_, i) => mtDay(i)))];
  const pipeline = redis.pipeline();
  for (const day of days) pipeline.zrange(`cov:${day}`, 0, -1, "WITHSCORES");
  const results = (await pipeline.exec()) ?? [];

  // Each day's furthest distance per sector, for days the receiver heard anything.
  const daily: { day: string; sectors: (number | null)[] }[] = [];
  days.forEach((day, i) => {
    const flat = (results[i]?.[1] as string[] | null) ?? [];
    if (!flat.length) return;
    const sectors: (number | null)[] = new Array(SECTORS).fill(null);
    for (let j = 0; j < flat.length; j += 2) sectors[Number(flat[j])] = Number(flat[j + 1]);
    daily.push({ day, sectors });
  });

  // Typical = the median day's reach in each direction, so one night of unusual
  // propagation doesn't define it; best = the furthest single ping.
  const windows: Record<string, { days: number; typical: number[]; best: number[] }> = {};
  for (const w of WINDOWS) {
    const inWindow = daily.filter((d) => days.indexOf(d.day) < w);
    const typical: number[] = [];
    const best: number[] = [];
    for (let s = 0; s < SECTORS; s++) {
      const values = inWindow.map((d) => d.sectors[s]).filter((v): v is number => v != null);
      typical.push(values.length ? median(values) : 0);
      best.push(values.length ? Math.max(...values) : 0);
    }
    windows[w] = { days: inWindow.length, typical, best };
  }

  return res.status(200).json({
    sectorDeg: SECTOR_DEG,
    windows,
    since: daily.at(-1)?.day ?? null,
  });
}
