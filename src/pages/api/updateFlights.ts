import type { APIRoute } from "astro";

// simple in-memory cache
let latestData: any = null;

// handle pushes from your Pi
export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${import.meta.env.UPDATE_TOKEN}`) {
    return new Response("unauthorized", { status: 401 });
  }
  try {
    latestData = await request.json();
    return new Response("ok");
  } catch {
    return new Response("bad json", { status: 400 });
  }
};

// serve cached data to your page
export const GET: APIRoute = async () => {
  if (!latestData) return new Response("no data yet", { status: 404 });
  return new Response(JSON.stringify(latestData), {
    headers: { "Content-Type": "application/json" }
  });
};
