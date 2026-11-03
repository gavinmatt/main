// Sanity checks for decoded positions, applied at ingest before anything
// is stored. Pure functions, so they're unit tested without Redis.

import { distanceNm } from "./flightClassify.js";

// Generous on purpose: only reject what physics rules out, not what's merely unusual.
const ANTENNA_FT = 100;
const HORIZON_MARGIN = 1.25; // radio ducting reaches past the geometric horizon
const HORIZON_SLACK_NM = 20;
export const MAX_SPEED_KT = 1200;
// Fixes this close together are within decode and timing noise.
const MIN_JUMP_NM = 3;

// Furthest a plane at this altitude could be heard, in NM. Radio horizon is
// 1.23 × (√antenna ft + √aircraft ft); unknown altitude means no limit.
export function maxHearableNm(altFt) {
  if (altFt === "ground") altFt = 0;
  if (typeof altFt !== "number" || !Number.isFinite(altFt)) return Infinity;
  const horizon = 1.23 * (Math.sqrt(ANTENNA_FT) + Math.sqrt(Math.max(0, altFt)));
  return horizon * HORIZON_MARGIN + HORIZON_SLACK_NM;
}

// Whether moving from the previous fix to this one would take an impossible speed.
// Fixes are { lat, lon, t } with t in milliseconds.
export function isImpossibleJump(prev, next) {
  if (!prev || next.t <= prev.t) return false;
  const nm = distanceNm(prev.lat, prev.lon, next.lat, next.lon);
  if (nm < MIN_JUMP_NM) return false;
  const hours = (next.t - prev.t) / 3_600_000;
  return nm / hours > MAX_SPEED_KT;
}

// Compass bearing from one point to another, 0–360° clockwise from north.
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
