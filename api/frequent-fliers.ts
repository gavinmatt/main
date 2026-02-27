import type { VercelRequest, VercelResponse } from "@vercel/node";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  const raw = (await redis.get("frequent-fliers:v1")) ?? "[]";
  let rows: any[];
  try {
    rows = JSON.parse(raw);
  } catch {
    rows = [];
  }

  return res.status(200).json({ rows });
}