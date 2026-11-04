import type { VercelRequest, VercelResponse } from "./_vercel.js";
import { Redis } from "ioredis";
import { waitUntil } from "@vercel/functions";
import { compactQso, mergeQsos, parseADIF, summarizeQsls } from "../src/lib/qslStats.js";

const redis = new Redis(process.env.REDIS_URL!);

// The confirmed log, kept so each refresh only downloads what's new since the last.
// Bump both together when compactQso keeps a new field, to download the whole log again.
const QSOS_KEY = "lotw:qsos_v2";
const CURSOR_KEY = "lotw:cursor_v2";
// What the page shows. Never expires: a stale copy is served while a fresh one is built.
const SUMMARY_KEY = "lotw:summary_v2";
const REFRESH_LOCK_KEY = "lotw:refresh_lock";
const MOST_WANTED_KEY = "clublog:mostwanted";

const REFRESH_AFTER_MS = 2 * 60 * 60 * 1000;
const REFRESH_LOCK_TTL = 120;
const MOST_WANTED_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const LOTW_TIMEOUT_MS = 55_000;

// Club Log's worldwide Most Wanted list, as DXCC number → rank. Kept a week; an old
// copy beats none if Club Log is down.
async function mostWantedRanks(): Promise<Record<string, number>> {
  const cached = await redis.get(MOST_WANTED_KEY);
  const stored = cached ? (JSON.parse(cached) as { fetched: number; ranks: Record<string, number> }) : null;
  if (stored && Date.now() - stored.fetched < MOST_WANTED_REFRESH_MS) return stored.ranks;
  try {
    const response = await fetch("https://clublog.org/mostwanted.php?api=1", { signal: AbortSignal.timeout(10_000) });
    const byRank = (await response.json()) as Record<string, string>;
    const ranks: Record<string, number> = {};
    for (const [rank, dxcc] of Object.entries(byRank)) ranks[dxcc] = Number(rank);
    await redis.set(MOST_WANTED_KEY, JSON.stringify({ fetched: Date.now(), ranks }));
    return ranks;
  } catch (e) {
    console.error("Club Log most wanted error:", e);
    return stored?.ranks ?? {};
  }
}

async function refresh() {
  const [storedQsos, cursor] = await Promise.all([redis.get(QSOS_KEY), redis.get(CURSOR_KEY)]);
  const existing = storedQsos ? JSON.parse(storedQsos) : [];

  const url = new URL("https://lotw.arrl.org/lotwuser/lotwreport.adi");
  url.searchParams.set("login", process.env.LOTW_USERNAME!);
  url.searchParams.set("password", process.env.LOTW_PASSWORD!);
  url.searchParams.set("qso_query", "1");
  url.searchParams.set("qso_qsl", "yes");
  url.searchParams.set("qso_qsldetail", "yes");
  // Whole days, so a confirmation logged the same second as the cursor isn't missed;
  // anything downloaded twice is merged away.
  url.searchParams.set("qso_qslsince", existing.length && cursor ? cursor.slice(0, 10) : "2000-01-01");

  const [text, ranks] = await Promise.all([
    fetch(url.toString(), { signal: AbortSignal.timeout(LOTW_TIMEOUT_MS) }).then((r) => r.text()),
    mostWantedRanks(),
  ]);
  // A bad login gets an HTML page rather than an ADIF report.
  if (!/<eoh>/i.test(text)) throw new Error("LoTW auth failed or no data");

  const { header, records } = parseADIF(text);
  const qsos = mergeQsos(existing, records.map(compactQso));
  const summary = { ...summarizeQsls(qsos, ranks), updated: new Date().toISOString() };

  const pipeline = redis.pipeline().set(QSOS_KEY, JSON.stringify(qsos)).set(SUMMARY_KEY, JSON.stringify(summary));
  if (header.APP_LOTW_LASTQSL) pipeline.set(CURSOR_KEY, header.APP_LOTW_LASTQSL);
  await pipeline.exec();
  return summary;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const cached = await redis.get(SUMMARY_KEY);
    if (cached) {
      const summary = JSON.parse(cached);
      if (Date.now() - Date.parse(summary.updated) > REFRESH_AFTER_MS) {
        // LoTW takes 10+ seconds to answer, so nobody waits on it: they get the
        // stored copy, and the next visitor gets the refreshed one.
        const locked = await redis.set(REFRESH_LOCK_KEY, "1", "EX", REFRESH_LOCK_TTL, "NX");
        if (locked) {
          waitUntil(
            refresh()
              .catch((e) => console.error("QSL refresh error:", e))
              .finally(() => redis.del(REFRESH_LOCK_KEY))
          );
        }
      }
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
      return res.status(200).json(summary);
    }

    // First run: nothing stored yet, so this one visit does wait.
    const summary = await refresh();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).json(summary);
  } catch (e) {
    console.error("QSL map error:", e);
    return res.status(502).json({ error: "Couldn't load QSLs from LoTW" });
  }
}
