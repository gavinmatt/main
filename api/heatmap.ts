import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  const raw = (await redis.get("heatmap:v1")) ?? "null";
  let grid: number[][] | null = null;
  try {
    grid = JSON.parse(raw);
  } catch {
    grid = null;
  }

  // Return a zeroed grid if nothing accumulated yet
  if (!grid || !Array.isArray(grid) || grid.length !== 7) {
    grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  }

  return res.status(200).json({ grid });
}