import { useEffect, useRef, useState } from 'react';
import type { Coords, Map as LeafletMap } from 'leaflet';

const RX_LAT = 48.43;
const RX_LON = -114.4755;
const RING_NM = [50, 100, 150, 200, 250];
const NM_TO_M = 1852;
// Ingest records one sample per plane every 15 seconds.
const SAMPLES_PER_MINUTE = 4;

// One hue, dim and see-through for rarely flown cells up to near-white for the busiest,
// so airways glow over the dark base map.
const RAMP_FROM = [40, 90, 170, 0.35];
const RAMP_TO = [215, 235, 255, 0.95];

interface Density {
  latStep: number;
  lonStep: number;
  cells: [number, number, number][];
  since: string | null;
}

function rampColor(t: number) {
  const [r, g, b, a] = RAMP_FROM.map((c, i) => c + (RAMP_TO[i] - c) * t);
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(2)})`;
}

function minutesLabel(samples: number) {
  const minutes = samples / SAMPLES_PER_MINUTE;
  if (minutes >= 120) return `${Math.round(minutes / 60).toLocaleString()} aircraft-hours`;
  return `${Math.max(1, Math.round(minutes))} aircraft-minute${Math.round(minutes) === 1 ? '' : 's'}`;
}

export default function DensityMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const [since, setSince] = useState<string | null>(null);
  const [cellCount, setCellCount] = useState<number | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([import('leaflet'), fetch('/api/density').then((r) => r.json() as Promise<Density>)]).then(
      ([L, data]) => {
        if (cancelled || !mapRef.current || mapInstance.current) return;
        setSince(data.since);
        setCellCount(data.cells.length);

        const map = L.map(mapRef.current, {
          center: [RX_LAT, RX_LON],
          zoom: 6,
          minZoom: 4,
          maxZoom: 10,
          // The page scrolls past this card; zoom with the buttons or a pinch.
          scrollWheelZoom: false,
        });
        mapInstance.current = map;

        L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.PUBLIC_CARTO_API_KEY}`, {
          attribution: '© OpenStreetMap © CARTO',
          subdomains: 'abcd',
        }).addTo(map);

        const counts = new Map<string, number>();
        let max = 0;
        for (const [lat, lon, n] of data.cells) {
          counts.set(`${lat},${lon}`, n);
          max = Math.max(max, n);
        }
        // Log scale: the busiest airway has thousands of samples, a stray GA flight a few.
        const logMax = Math.log1p(max);

        const DensityLayer = L.GridLayer.extend({
          createTile(coords: Coords) {
            const tile = document.createElement('canvas');
            const size = this.getTileSize();
            tile.width = size.x;
            tile.height = size.y;
            const ctx = tile.getContext('2d')!;
            const origin = coords.scaleBy(size);
            const nw = map.unproject(origin, coords.z);
            const se = map.unproject(origin.add(size), coords.z);
            for (const [latIdx, lonIdx, n] of data.cells) {
              const south = latIdx * data.latStep;
              const west = lonIdx * data.lonStep;
              const north = south + data.latStep;
              const east = west + data.lonStep;
              if (north < se.lat || south > nw.lat || east < nw.lng || west > se.lng) continue;
              const a = map.project([north, west], coords.z).subtract(origin);
              const b = map.project([south, east], coords.z).subtract(origin);
              ctx.fillStyle = rampColor(logMax ? Math.log1p(n) / logMax : 0);
              // Rounded out by a pixel so neighbouring cells don't leave hairline gaps.
              ctx.fillRect(Math.floor(a.x), Math.floor(a.y), Math.ceil(b.x - a.x) + 1, Math.ceil(b.y - a.y) + 1);
            }
            return tile;
          },
        });
        new DensityLayer({ opacity: 1 }).addTo(map);

        for (const nm of RING_NM) {
          L.circle([RX_LAT, RX_LON], {
            radius: nm * NM_TO_M,
            color: '#64748b',
            weight: 1,
            opacity: 0.6,
            fill: false,
            interactive: false,
          }).addTo(map);
        }
        L.circleMarker([RX_LAT, RX_LON], {
          radius: 4,
          color: '#fff',
          weight: 1.5,
          fillColor: '#ef4444',
          fillOpacity: 1,
          interactive: false,
        }).addTo(map);

        map.on('mousemove', (e) => {
          const key = `${Math.floor(e.latlng.lat / data.latStep)},${Math.floor(e.latlng.lng / data.lonStep)}`;
          const n = counts.get(key);
          setHover(n ? `${minutesLabel(n)} in this square` : 'No traffic recorded in this square');
        });
        map.on('mouseout', () => setHover(null));
        map.on('click', (e) => map.fire('mousemove', e));
      }
    ).catch(() => {});

    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  const sinceLabel = since
    ? new Date(`${since}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="w-full">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={mapRef}
        className="h-[360px] sm:h-[520px] w-full rounded-lg overflow-hidden border border-base-300"
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-base-content/50 mt-2">
        <span className="flex items-center gap-1.5">
          Less
          {/* On the map's own dark base, since the ramp is see-through. */}
          <span className="inline-flex gap-0.5 rounded p-0.5" style={{ background: '#262626' }}>
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="inline-block w-4 h-3 rounded-sm" style={{ background: rampColor(i / 7) }} />
            ))}
          </span>
          More
        </span>
        <span>
          {hover ??
            (cellCount == null
              ? 'Loading…'
              : cellCount === 0
                ? 'No positions recorded yet'
                : `Hover or tap a square for its traffic${sinceLabel ? ` · collecting since ${sinceLabel}` : ''}`)}
        </span>
      </div>
    </div>
  );
}
