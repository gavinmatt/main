import type { VercelRequest, VercelResponse } from "./_vercel.js";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// Must match the cell size ingest writes with.
const LAT_STEP = 0.05;
const LON_STEP = 0.075;
const MONTHS = 3;

// The current and previous Mountain Time months, as YYYY-MM.
function mtMonths(count: number) {
  const [y, m] = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Denver" })
    .split("-")
    .map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  // Months of samples barely change in a few minutes.
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");

  const pipeline = redis.pipeline();
  for (const month of mtMonths(MONTHS)) pipeline.hgetall(`pd:${month}`);
  pipeline.get("pd:since");
  const results = (await pipeline.exec()) ?? [];

  const sums = new Map<string, number>();
  for (const [, hash] of results.slice(0, MONTHS) as [Error | null, Record<string, string>][]) {
    for (const [cell, n] of Object.entries(hash ?? {})) {
      sums.set(cell, (sums.get(cell) ?? 0) + Number(n));
    }
  }
  // [lat index, lon index, samples]; the cell's south-west corner is index × step.
  const cells = [...sums].map(([cell, n]) => {
    const [lat, lon] = cell.split(",").map(Number);
    return [lat, lon, n];
  });

  return res.status(200).json({
    latStep: LAT_STEP,
    lonStep: LON_STEP,
    cells,
    since: results[MONTHS]?.[1] ?? null,
  });
}
