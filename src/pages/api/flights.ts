import type { APIRoute } from "astro";

// Replace with your own ADS-B Exchange feed hex (from your station)
const FEED_HEX = "dzxvAzrTfUSY";
const FEED_URL = `https://api.adsbexchange.com/VirtualRadar/AircraftList.json?feed=${FEED_HEX}`;

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`ADS-B feed error ${res.status}`);
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
