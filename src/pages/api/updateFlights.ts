import type { APIRoute } from "astro";
import { put } from "@vercel/blob";

const BLOB_KEY = "adsb/latest.json";

// Pi pushes JSON here
export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${import.meta.env.UPDATE_TOKEN}`) {
    return new Response("unauthorized", { status: 401 });
  }
  try {
    const body = await request.text(); // raw JSON string
    if (!body.trim().startsWith("{")) {
      return new Response("bad json", { status: 400 });
    }
    await put(BLOB_KEY, body, {
      access: "public",
      contentType: "application/json",
      token: import.meta.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return new Response("ok");
  } catch {
    return new Response("error", { status: 500 });
  }
};

// site reads the last pushed JSON here
export const GET: APIRoute = async () => {
  const url = `https://blob.vercel-storage.com/${BLOB_KEY}`;
  const head = await fetch(url, { method: "HEAD" });
  if (!head.ok) return new Response("no data yet", { status: 404 });
  const res = await fetch(url);
  return new Response(await res.text(), {
    headers: { "Content-Type": "application/json" }
  });
};
EOF
