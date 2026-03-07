import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

const FREQUENT_FLIERS_KEY = "frequent-fliers:v2"; // must match flight-ingest.ts
const MAX_FREQUENT_FLIERS_SERVED = 10;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  const raw = (await redis.get(FREQUENT_FLIERS_KEY)) ?? "[]";
  let rows: any[];
  try {
    rows = JSON.parse(raw);
  } catch {
    rows = [];
  }

  // Slice here, not at write time, so all callsigns can compete for the top spots.
  return res.status(200).json({ rows: rows.slice(0, MAX_FREQUENT_FLIERS_SERVED) });
}