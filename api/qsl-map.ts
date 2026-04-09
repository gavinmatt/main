import Redis from 'ioredis';

const CACHE_KEY = 'lotw:qsl_map_v9';
const CACHE_TTL = 60 * 60 * 6;

// Reference point — not exposed to client
const REF_LAT = 48.37;
const REF_LON = -114.58;

function distanceMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseADIF(raw: string): Record<string, string>[] {
  const records: Record<string, string>[] = [];
  const cleaned = raw.replace(/\/\/[^\n]*/g, '');
  const rawRecords = cleaned.split(/<eor>/i);
  for (const record of rawRecords) {
    const fields: Record<string, string> = {};
    const regex = /<([A-Z0-9_]+)(?::\d+(?::[A-Z])?)?>([^<]*)/gi;
    let match;
    while ((match = regex.exec(record)) !== null) {
      fields[match[1].toUpperCase()] = match[2].trim();
    }
    if (fields['CALL']) records.push(fields);
  }
  return records;
}

function gridToLatLon(grid: string): [number, number] | null {
  if (!grid || grid.length < 4) return null;
  const g = grid.toUpperCase();
  const lon = (g.charCodeAt(0) - 65) * 20 - 180 + (parseInt(g[2]) * 2) + 1;
  const lat = (g.charCodeAt(1) - 65) * 10 - 90 + parseInt(g[3]) + 0.5;
  if (isNaN(lon) || isNaN(lat)) return null;
  return [lat, lon];
}

const US_STATE_COORDS: Record<string, [number, number]> = {
  AL: [32.8, -86.8], AK: [64.2, -153.4], AZ: [34.3, -111.1],
  AR: [34.8, -92.2], CA: [36.8, -119.4], CO: [39.0, -105.5],
  CT: [41.6, -72.7], DE: [39.0, -75.5],  FL: [27.8, -81.6],
  GA: [32.7, -83.4], HI: [19.9, -155.6], ID: [44.1, -114.5],
  IL: [40.0, -89.2], IN: [40.3, -86.1],  IA: [42.0, -93.2],
  KS: [38.5, -98.3], KY: [37.7, -84.9],  LA: [31.2, -92.1],
  ME: [44.7, -69.4], MD: [39.1, -76.8],  MA: [42.3, -71.8],
  MI: [44.2, -85.5], MN: [46.4, -93.1],  MS: [32.7, -89.7],
  MO: [38.5, -92.5], MT: [47.0, -110.0], NE: [41.5, -99.9],
  NV: [38.5, -117.1], NH: [43.7, -71.6], NJ: [40.1, -74.5],
  NM: [34.5, -106.2], NY: [42.9, -75.5], NC: [35.6, -79.4],
  ND: [47.5, -100.5], OH: [40.4, -82.8], OK: [35.6, -97.5],
  OR: [44.6, -122.1], PA: [40.6, -77.2], RI: [41.7, -71.5],
  SC: [33.8, -80.9], SD: [44.4, -100.2], TN: [35.9, -86.4],
  TX: [31.5, -99.3], UT: [39.4, -111.1], VT: [44.1, -72.7],
  VA: [37.8, -79.5], WA: [47.4, -120.6], WV: [38.6, -80.6],
  WI: [44.3, -89.6], WY: [43.0, -107.6],
};

const CA_PROVINCE_COORDS: Record<string, [number, number]> = {
  AB: [53.9, -116.6], BC: [53.7, -127.6], MB: [53.8,  -98.8],
  NB: [46.5,  -66.5], NL: [53.1,  -57.7], NS: [45.0,  -63.0],
  NT: [64.8, -124.8], NU: [70.3,  -86.5], ON: [51.3,  -85.3],
  PE: [46.3,  -63.1], QC: [53.0,  -70.8], SK: [52.9, -106.4],
  YT: [64.3, -135.0],
};

const COUNTRY_CENTROID_OVERRIDES: Record<string, [number, number]> = {
  'ALASKA':             [64.2,  -153.4],
  'HAWAII':             [19.9,  -155.6],
  'PUERTO RICO':        [18.2,   -66.6],
  'GALAPAGOS ISLANDS':  [-0.7,   -90.6],
  'CAPE VERDE':         [16.0,   -24.0],
  'GUINEA-BISSAU':      [11.8,   -15.2],
  'ARUBA':              [12.5,   -70.0],
  'BARBADOS':           [13.2,   -59.5],
  'SAINT LUCIA':        [13.9,   -60.9],
  'DOMINICAN REPUBLIC': [18.7,   -70.2],
  'MADEIRA ISLANDS':    [32.8,   -17.0],
  'CANARY ISLANDS':     [28.3,   -16.6],
  'ASIATIC RUSSIA':     [61.5,   105.3],
  'EUROPEAN RUSSIA':    [55.8,    37.6],
  'JAPAN':              [36.2,   138.3],
  'ARGENTINA':          [-38.4,  -63.6],
  'PORTUGAL':           [39.4,    -8.2],
  'SPAIN':              [40.4,    -3.7],
  'CANADA':             [56.1,  -106.3],
};

const US_DXCC = '291';
const CA_DXCC = '1';

export default async function handler(req: any, res: any) {
  try {
    const redis = new Redis(process.env.REDIS_URL!);

    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      await redis.quit();
      return res.status(200).json(JSON.parse(cached));
    }

    const username = process.env.LOTW_USERNAME!;
    const password = process.env.LOTW_PASSWORD!;

    const url = new URL('https://lotw.arrl.org/lotwuser/lotwreport.adi');
    url.searchParams.set('login', username);
    url.searchParams.set('password', password);
    url.searchParams.set('qso_query', '1');
    url.searchParams.set('qso_qsl', 'yes');
    url.searchParams.set('qso_qsldetail', 'yes');
    url.searchParams.set('qso_qslsince', '2000-01-01');

    const response = await fetch(url.toString());
    const text = await response.text();

    if (!text.includes('APP_LoTW_LASTQSL') && !text.includes('APP_LOTW_LASTQSL')) {
      await redis.quit();
      return res.status(502).json({ error: 'LOTW auth failed or no data' });
    }

    const records = parseADIF(text);

    const stateCounts = new Map<string, number>();
    const provinceCounts = new Map<string, number>();
    const dxCounts = new Map<string, { count: number; lat: number; lon: number; country: string; distanceMi: number }>();

    for (const r of records) {
      const dxcc = r['DXCC'] || '';
      const country = r['COUNTRY'] || '';
      const state = r['STATE'] || '';
      const grid = r['GRIDSQUARE'] || '';

      if (dxcc === US_DXCC) {
        if (state && US_STATE_COORDS[state]) {
          stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
        }
      } else if (dxcc === CA_DXCC) {
        if (state && CA_PROVINCE_COORDS[state]) {
          provinceCounts.set(state, (provinceCounts.get(state) ?? 0) + 1);
        }
      } else {
        if (!country) continue;
        const existing = dxCounts.get(country);
        if (existing) {
          existing.count++;
        } else {
          const override = COUNTRY_CENTROID_OVERRIDES[country];
          const coords: [number, number] | null = override ?? gridToLatLon(grid);
          if (!coords) continue;
          const mi = Math.round(distanceMi(REF_LAT, REF_LON, coords[0], coords[1]));
          dxCounts.set(country, { count: 1, lat: coords[0], lon: coords[1], country, distanceMi: mi });
        }
      }
    }

    const dxArray = Array.from(dxCounts.values());

    const result = {
      states: Array.from(stateCounts.entries()).map(([state, count]) => ({
        state,
        count,
        lat: US_STATE_COORDS[state][0],
        lon: US_STATE_COORDS[state][1],
      })),
      provinces: Array.from(provinceCounts.entries()).map(([province, count]) => ({
        province,
        count,
        lat: CA_PROVINCE_COORDS[province][0],
        lon: CA_PROVINCE_COORDS[province][1],
      })),
      dx: dxArray,
      // Sorted by distance descending, no coordinates included
      dxByDistance: dxArray
        .slice()
        .sort((a, b) => b.distanceMi - a.distanceMi)
        .map(({ country, distanceMi, count }) => ({ country, distanceMi, count })),
      total: records.length,
      updated: new Date().toISOString(),
    };

    await redis.set(CACHE_KEY, JSON.stringify(result), 'EX', CACHE_TTL);
    await redis.quit();

    return res.status(200).json(result);
  } catch (e) {
    console.error('QSL map error:', e);
    return res.status(500).json({ error: String(e) });
  }
}