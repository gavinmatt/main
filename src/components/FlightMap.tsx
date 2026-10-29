import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { airlineFromFlight, classifyNotability } from '../lib/flightClassify.js';

const RX_LAT = 48.415;
const RX_LON = -114.459;
const REFRESH_MS = 10_000;
const STALE_AFTER_S = 90;
const RING_NM = [50, 100, 150, 200, 250];
const NM_TO_M = 1852;

interface Aircraft {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  track?: number;
  alt_baro?: number | string;
  alt_geom?: number;
  gs?: number;
  seen?: number;
  category?: string;
}

const DEFAULT_COLOR = '#cbd5e1';

// Mirrors the badge colors in the flight table.
const FLAG_COLORS = {
  military: '#ef4444',
  tanker: '#b91c1c',
  heli: '#10b981',
  test: '#f59e0b',
  uncommon: '#3b82f6',
  fastHigh: '#facc15',
};

const LEGEND = [
  { color: FLAG_COLORS.military, label: 'Military' },
  { color: FLAG_COLORS.heli, label: 'Helicopter' },
  { color: FLAG_COLORS.test, label: 'Test flight' },
  { color: FLAG_COLORS.uncommon, label: 'Uncommon airline' },
  { color: FLAG_COLORS.fastHigh, label: 'Fast/high' },
  { color: DEFAULT_COLOR, label: 'Other' },
];

function flagColor(label: string | undefined) {
  if (!label) return DEFAULT_COLOR;
  if (label.includes('TANKER')) return FLAG_COLORS.tanker;
  if (/^US[AFNM]/.test(label)) return FLAG_COLORS.military;
  if (label === 'HELI') return FLAG_COLORS.heli;
  if (label === 'Test Flight') return FLAG_COLORS.test;
  if (label === 'UNCOMMON') return FLAG_COLORS.uncommon;
  if (label === 'FAST/HIGH') return FLAG_COLORS.fastHigh;
  return DEFAULT_COLOR;
}

function planeSvg(track: number, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
    style="transform: rotate(${track}deg); transform-origin: 50% 50%;">
    <path d="M12 2c.6 0 1 .5 1 1.2V9l8 4.5v2l-8-2.4V18l2.5 1.8V21.5L12 20.6l-3.5.9V19.8L11 18v-4.9l-8 2.4v-2L11 9V3.2C11 2.5 11.4 2 12 2z"
      fill="${color}" stroke="#1f2937" stroke-width="0.8"/>
  </svg>`;
}

export default function FlightMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    let cancelled = false;

    import('leaflet').then(L => {
      if (cancelled || !mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current, {
        center: [RX_LAT, RX_LON],
        zoom: 7,
        minZoom: 4,
      });
      mapInstance.current = map;

      L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.PUBLIC_CARTO_API_KEY}`, {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
      }).addTo(map);

      for (const nm of RING_NM) {
        L.circle([RX_LAT, RX_LON], {
          radius: nm * NM_TO_M,
          color: '#64748b',
          weight: 1,
          fill: false,
          interactive: false,
        }).addTo(map);
      }

      const homeIcon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
          <path d="M12 0C7.6 0 4 3.6 4 8c0 6 8 18 8 18s8-12 8-18c0-4.4-3.6-8-8-8z" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
          <circle cx="12" cy="8" r="3.5" fill="#fff"/>
        </svg>`,
        className: '',
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32],
      });
      L.marker([RX_LAT, RX_LON], { icon: homeIcon })
        .addTo(map)
        .bindPopup('<b>Receiver</b><br>Whitefish, MT');

      const layer = L.layerGroup().addTo(map);
      layerRef.current = layer;

      async function refresh() {
        try {
          const res = await fetch('/api/flights');
          if (res.status === 204) return;
          const data = await res.json();
          const aircraft: Aircraft[] = (data.aircraft ?? []).filter(
            (f: Aircraft) =>
              f.lat != null && f.lon != null && (f.seen ?? 0) <= STALE_AFTER_S
          );

          layer.clearLayers();
          for (const f of aircraft) {
            const cs = f.flight?.trim() || 'No callsign';
            const alt = f.alt_baro ?? f.alt_geom ?? '—';
            const flag = classifyNotability(f)?.label;
            const airline = airlineFromFlight(f);
            const hasAirline = airline !== '—' && airline !== 'Undetermined';
            L.marker([f.lat!, f.lon!], {
              icon: L.divIcon({
                html: planeSvg(f.track ?? 0, flagColor(flag)),
                className: '',
                iconSize: [22, 22],
                iconAnchor: [11, 11],
              }),
            })
              .bindTooltip(hasAirline ? `${cs} · ${airline}` : cs, { direction: 'top', offset: [0, -10] })
              .bindPopup(
                `<b>${cs}</b>${flag ? ` · ${flag}` : ''}${hasAirline ? `<br>${airline}` : ''}<br>ICAO: ${f.hex ?? '—'}<br>Alt: ${alt} ft<br>Speed: ${f.gs ?? '—'} kt<br>Track: ${f.track ?? '—'}°`
              )
              .addTo(layer);
          }
          setCount(aircraft.length);
        } catch {}
      }

      refresh();
      timer = setInterval(refresh, REFRESH_MS);
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div className="w-full max-w-[800px]">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div
        ref={mapRef}
        style={{ height: '600px', width: '100%' }}
        className="rounded-lg overflow-hidden border border-base-300"
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/50 mt-2">
        {LEGEND.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} /> {label}
          </span>
        ))}
      </div>
      <div className="text-xs text-base-content/50 mt-1">
        {count == null ? 'Loading aircraft…' : `${count} aircraft on map`} · rings every 50 NM
      </div>
    </div>
  );
}
