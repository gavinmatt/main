import { pollWhileVisible } from "./poll.js";

// One shared /api/flights poll for everything on the page (map and table),
// so a viewer costs one request per refresh instead of one per consumer.
const REFRESH_MS = 10_000;
const listeners = new Set();
let stopPolling = null;
let latest = null;

async function fetchFlights() {
  try {
    const res = await fetch("/api/flights");
    if (res.status === 204) return;
    const data = await res.json();
    latest = data;
    listeners.forEach((fn) => fn(data));
  } catch {}
}

export function subscribeFlights(fn) {
  listeners.add(fn);
  // A late subscriber gets the current batch now instead of waiting for the next poll.
  if (latest) fn(latest);
  if (!stopPolling) stopPolling = pollWhileVisible(fetchFlights, REFRESH_MS);
  return () => {
    listeners.delete(fn);
    if (!listeners.size) {
      stopPolling();
      stopPolling = null;
    }
  };
}
