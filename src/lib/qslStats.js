// Turns Logbook of the World confirmations into everything the radio page shows.
// Pure functions, so they're unit tested without LoTW, Club Log or Redis.

export const US_DXCC = "291";
export const CA_DXCC = "1";
// Alaska and Hawaii are DXCC entities of their own, but still count toward Worked All States.
const STATE_ENTITIES = { 6: "AK", 110: "HI" };

// Reference point for distances; never sent to the client.
const REF_LAT = 48.37;
const REF_LON = -114.58;

// [name, lat, lon]
export const US_STATES = {
  AL: ["Alabama", 32.8, -86.8], AK: ["Alaska", 64.2, -153.4], AZ: ["Arizona", 34.3, -111.1],
  AR: ["Arkansas", 34.8, -92.2], CA: ["California", 36.8, -119.4], CO: ["Colorado", 39.0, -105.5],
  CT: ["Connecticut", 41.6, -72.7], DE: ["Delaware", 39.0, -75.5], FL: ["Florida", 27.8, -81.6],
  GA: ["Georgia", 32.7, -83.4], HI: ["Hawaii", 19.9, -155.6], ID: ["Idaho", 44.1, -114.5],
  IL: ["Illinois", 40.0, -89.2], IN: ["Indiana", 40.3, -86.1], IA: ["Iowa", 42.0, -93.2],
  KS: ["Kansas", 38.5, -98.3], KY: ["Kentucky", 37.7, -84.9], LA: ["Louisiana", 31.2, -92.1],
  ME: ["Maine", 44.7, -69.4], MD: ["Maryland", 39.1, -76.8], MA: ["Massachusetts", 42.3, -71.8],
  MI: ["Michigan", 44.2, -85.5], MN: ["Minnesota", 46.4, -93.1], MS: ["Mississippi", 32.7, -89.7],
  MO: ["Missouri", 38.5, -92.5], MT: ["Montana", 47.0, -110.0], NE: ["Nebraska", 41.5, -99.9],
  NV: ["Nevada", 38.5, -117.1], NH: ["New Hampshire", 43.7, -71.6], NJ: ["New Jersey", 40.1, -74.5],
  NM: ["New Mexico", 34.5, -106.2], NY: ["New York", 42.9, -75.5], NC: ["North Carolina", 35.6, -79.4],
  ND: ["North Dakota", 47.5, -100.5], OH: ["Ohio", 40.4, -82.8], OK: ["Oklahoma", 35.6, -97.5],
  OR: ["Oregon", 44.6, -122.1], PA: ["Pennsylvania", 40.6, -77.2], RI: ["Rhode Island", 41.7, -71.5],
  SC: ["South Carolina", 33.8, -80.9], SD: ["South Dakota", 44.4, -100.2], TN: ["Tennessee", 35.9, -86.4],
  TX: ["Texas", 31.5, -99.3], UT: ["Utah", 39.4, -111.1], VT: ["Vermont", 44.1, -72.7],
  VA: ["Virginia", 37.8, -79.5], WA: ["Washington", 47.4, -120.6], WV: ["West Virginia", 38.6, -80.6],
  WI: ["Wisconsin", 44.3, -89.6], WY: ["Wyoming", 43.0, -107.6],
};

export const CA_PROVINCES = {
  AB: ["Alberta", 53.9, -116.6], BC: ["British Columbia", 53.7, -127.6], MB: ["Manitoba", 53.8, -98.8],
  NB: ["New Brunswick", 46.5, -66.5], NL: ["Newfoundland and Labrador", 53.1, -57.7], NS: ["Nova Scotia", 45.0, -63.0],
  NT: ["Northwest Territories", 64.8, -124.8], NU: ["Nunavut", 70.3, -86.5], ON: ["Ontario", 51.3, -85.3],
  PE: ["Prince Edward Island", 46.3, -63.1], QC: ["Quebec", 53.0, -70.8], SK: ["Saskatchewan", 52.9, -106.4],
  YT: ["Yukon", 64.3, -135.0],
};

// Better map positions than a QSO's grid square for entities that span a lot of ground.
const COUNTRY_CENTROID_OVERRIDES = {
  "ALASKA": [64.2, -153.4],
  "HAWAII": [19.9, -155.6],
  "PUERTO RICO": [18.2, -66.6],
  "GALAPAGOS ISLANDS": [-0.7, -90.6],
  "CAPE VERDE": [16.0, -24.0],
  "GUINEA-BISSAU": [11.8, -15.2],
  "ARUBA": [12.5, -70.0],
  "BARBADOS": [13.2, -59.5],
  "SAINT LUCIA": [13.9, -60.9],
  "DOMINICAN REPUBLIC": [18.7, -70.2],
  "MADEIRA ISLANDS": [32.8, -17.0],
  "CANARY ISLANDS": [28.3, -16.6],
  "ASIATIC RUSSIA": [61.5, 105.3],
  "EUROPEAN RUSSIA": [55.8, 37.6],
  "JAPAN": [36.2, 138.3],
  "ARGENTINA": [-38.4, -63.6],
  "PORTUGAL": [39.4, -8.2],
  "SPAIN": [40.4, -3.7],
  "CANADA": [56.1, -106.3],
};

// The continent each CQ zone belongs to: [last zone, continent]. Zone 40 is the Arctic
// (Iceland, Svalbard, Franz Josef Land), which DXCC counts as Europe.
const ZONE_CONTINENTS = [
  [8, "NA"],
  [13, "SA"],
  [16, "EU"],
  [26, "AS"],
  [32, "OC"],
  [39, "AF"],
  [40, "EU"],
];
export const CONTINENTS = { NA: "North America", SA: "South America", EU: "Europe", AF: "Africa", AS: "Asia", OC: "Oceania" };
export const CQ_ZONES = 40;

// Half the Earth's circumference: the furthest any contact can be.
export const ANTIPODE_MI = 12_450;
const TIME_ZONE = "America/Denver";

// Club Log Most Wanted rank cutoffs, out of ~340 entities.
const RARITY_TIERS = [
  [50, "Most wanted"],
  [150, "Rare"],
  [250, "Uncommon"],
];

const RECENT_LIMIT = 15;

export function distanceMi(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns the ADIF header fields and the records after it.
export function parseADIF(raw) {
  const cleaned = raw.replace(/\/\/[^\n]*/g, "");
  const eoh = cleaned.search(/<eoh>/i);
  const fieldsOf = (text) => {
    const fields = {};
    const regex = /<([A-Z0-9_]+)(?::\d+(?::[A-Z])?)?>([^<]*)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) fields[match[1].toUpperCase()] = match[2].trim();
    return fields;
  };
  const header = eoh >= 0 ? fieldsOf(cleaned.slice(0, eoh)) : {};
  const body = eoh >= 0 ? cleaned.slice(eoh + 5) : cleaned;
  const records = body
    .split(/<eor>/i)
    .map(fieldsOf)
    .filter((f) => f.CALL);
  return { header, records };
}

// The fields we keep from each LoTW record, so the stored log stays small.
export function compactQso(r) {
  return {
    call: r.CALL,
    band: (r.BAND || "").toUpperCase(),
    // FT4 and friends come through as MODE=MFSK with the useful name in SUBMODE.
    mode: (r.SUBMODE || r.MODE || "").toUpperCase(),
    qsoDate: r.QSO_DATE || "",
    timeOn: r.TIME_ON || "",
    qslDate: r.QSLRDATE || r.QSO_DATE || "",
    dxcc: r.DXCC || "",
    country: r.COUNTRY || "",
    state: r.STATE || "",
    grid: r.GRIDSQUARE || "",
    cqz: r.CQZ ? String(Number(r.CQZ)) : "",
  };
}

export function qsoKey(q) {
  return `${q.call}|${q.qsoDate}|${q.timeOn}|${q.band}|${q.mode}`;
}

// Folds newly downloaded confirmations into the stored log; a re-sent QSO replaces its old copy.
export function mergeQsos(existing, incoming) {
  const byKey = new Map(existing.map((q) => [qsoKey(q), q]));
  for (const q of incoming) byKey.set(qsoKey(q), q);
  return [...byKey.values()];
}

export function gridToLatLon(grid) {
  if (!grid || grid.length < 4) return null;
  const g = grid.toUpperCase();
  const lon = (g.charCodeAt(0) - 65) * 20 - 180 + parseInt(g[2]) * 2 + 1;
  const lat = (g.charCodeAt(1) - 65) * 10 - 90 + parseInt(g[3]) + 0.5;
  if (isNaN(lon) || isNaN(lat)) return null;
  return [lat, lon];
}

export function toProperCase(str) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function continentOfZone(zone) {
  const z = Number(zone);
  if (!Number.isInteger(z) || z < 1 || z > CQ_ZONES) return null;
  return ZONE_CONTINENTS.find(([last]) => z <= last)[1];
}

function continentOf(q) {
  return continentOfZone(q.cqz) ?? (q.dxcc === US_DXCC || q.dxcc === CA_DXCC ? "NA" : null);
}

// LoTW dates are YYYYMMDD and times HHMMSS, in UTC.
function utcDate(ymd, hms = "000000") {
  return Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8), +hms.slice(0, 2) || 0, +hms.slice(2, 4) || 0);
}

const localHour = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" });

export function rarityTier(rank) {
  if (rank == null) return null;
  return RARITY_TIERS.find(([cutoff]) => rank <= cutoff)?.[1] ?? null;
}

function usStateOf(q) {
  if (q.dxcc === US_DXCC) return US_STATES[q.state] ? q.state : null;
  return STATE_ENTITIES[q.dxcc] ?? null;
}

// What a QSO counts toward: a state, a province, or a DXCC entity.
function regionOf(q) {
  if (q.dxcc === US_DXCC) {
    return US_STATES[q.state] ? { key: `US-${q.state}`, kind: "state", name: US_STATES[q.state][0] } : null;
  }
  if (q.dxcc === CA_DXCC) {
    return CA_PROVINCES[q.state] ? { key: `CA-${q.state}`, kind: "province", name: CA_PROVINCES[q.state][0] } : null;
  }
  return q.country ? { key: `DX-${q.country}`, kind: "entity", name: toProperCase(q.country) } : null;
}

function countBy(items, keyOf) {
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// `mostWanted` maps a DXCC number to its Club Log Most Wanted rank (1 = most wanted).
export function summarizeQsls(qsos, mostWanted = {}) {
  // Oldest confirmation first, so the first QSO seen for a region is the one that added it.
  const ordered = [...qsos].sort(
    (a, b) => a.qslDate.localeCompare(b.qslDate) || a.qsoDate.localeCompare(b.qsoDate) || a.timeOn.localeCompare(b.timeOn)
  );

  const firstOfRegion = new Set();
  const seenRegions = new Set();
  for (const q of ordered) {
    const region = regionOf(q);
    if (region && !seenRegions.has(region.key)) {
      seenRegions.add(region.key);
      firstOfRegion.add(q);
    }
  }

  // `entity` marks states that also appear among the DX entities, so the map doesn't plot them twice.
  const stateEntities = new Set(Object.values(STATE_ENTITIES));
  const states = [...countBy(qsos, usStateOf)].map(([state, count]) => ({
    state,
    name: US_STATES[state][0],
    count,
    lat: US_STATES[state][1],
    lon: US_STATES[state][2],
    entity: stateEntities.has(state),
  }));
  const provinces = [...countBy(qsos, (q) => (q.dxcc === CA_DXCC && CA_PROVINCES[q.state] ? q.state : null))].map(
    ([province, count]) => ({
      province,
      name: CA_PROVINCES[province][0],
      count,
      lat: CA_PROVINCES[province][1],
      lon: CA_PROVINCES[province][2],
    })
  );

  const dxByCountry = new Map();
  for (const q of ordered) {
    if (q.dxcc === US_DXCC || q.dxcc === CA_DXCC || !q.country) continue;
    const existing = dxByCountry.get(q.country);
    if (existing) {
      existing.count++;
      continue;
    }
    const coords = COUNTRY_CENTROID_OVERRIDES[q.country] ?? gridToLatLon(q.grid);
    if (!coords) continue;
    const rank = mostWanted[q.dxcc] ?? null;
    dxByCountry.set(q.country, {
      country: q.country,
      name: toProperCase(q.country),
      count: 1,
      lat: coords[0],
      lon: coords[1],
      distanceMi: Math.round(distanceMi(REF_LAT, REF_LON, coords[0], coords[1])),
      rank,
      tier: rarityTier(rank),
      continent: continentOf(q),
    });
  }
  const dx = [...dxByCountry.values()];

  const continentCounts = countBy(qsos, continentOf);
  const continents = Object.entries(CONTINENTS).map(([code, name]) => ({ code, name, count: continentCounts.get(code) ?? 0 }));
  const zones = Object.fromEntries(countBy(qsos, (q) => q.cqz || null));

  // When contacts happen, by local hour of the day.
  const hours = new Array(24).fill(0);
  for (const q of qsos) {
    if (q.qsoDate && q.timeOn) hours[Number(localHour.format(utcDate(q.qsoDate, q.timeOn)))]++;
  }

  // Days from the contact to the other station confirming it.
  const lags = qsos
    .filter((q) => q.qsoDate && q.qslDate)
    .map((q) => Math.max(0, Math.round((utcDate(q.qslDate) - utcDate(q.qsoDate)) / 86_400_000)))
    .sort((a, b) => a - b);
  const confirmDays = lags.length ? { median: lags[Math.floor(lags.length / 2)], fastest: lags[0], slowest: lags.at(-1) } : null;

  const recent = ordered
    .slice(-RECENT_LIMIT)
    .reverse()
    .map((q) => {
      const region = regionOf(q);
      return {
        call: q.call,
        band: q.band,
        mode: q.mode,
        qsoDate: q.qsoDate,
        qslDate: q.qslDate,
        region: region?.name ?? toProperCase(q.country || "Unknown"),
        kind: region?.kind ?? null,
        isNew: firstOfRegion.has(q),
      };
    });

  return {
    states,
    provinces,
    dx,
    dxByDistance: [...dx]
      .sort((a, b) => b.distanceMi - a.distanceMi)
      .map(({ name, distanceMi, count, continent }) => ({ name, distanceMi, count, continent })),
    rare: dx
      .filter((d) => d.rank != null)
      .sort((a, b) => a.rank - b.rank)
      .map(({ name, rank, tier, count, distanceMi }) => ({ name, rank, tier, count, distanceMi })),
    rankedEntities: Object.keys(mostWanted).length,
    entities: new Set(qsos.map((q) => q.dxcc).filter(Boolean)).size,
    continents,
    zones,
    hours,
    confirmDays,
    recent,
    total: qsos.length,
  };
}
