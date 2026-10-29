import { useEffect, useRef, useState } from 'react';
import type { LatLng, Map as LeafletMap, LayerGroup, Marker as LeafletMarker, Polyline } from 'leaflet';
import {
  airlineFromFlight,
  classifyNotability,
  distanceNm,
  emergencyReason,
  escapeHtml,
} from '../lib/flightClassify.js';

const RX_LAT = 48.415;
const RX_LON = -114.459;
const REFRESH_MS = 10_000;
const STALE_AFTER_S = 90;
const RING_NM = [50, 100, 150, 200, 250];
const NM_TO_M = 1852;
const TRAIL_POINTS = 30; // ~5 minutes at the refresh rate
const OVERHEAD_NM = 3;
const TOAST_MS = 10_000;

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
  squawk?: string;
  emergency?: string;
}

interface Toast {
  id: string;
  text: string;
}

const DEFAULT_COLOR = '#cbd5e1';

// Mirrors the badge colors in the flight table.
const FLAG_COLORS = {
  emergency: '#ff1f1f',
  military: '#ef4444',
  tanker: '#b91c1c',
  fire: '#f97316',
  heli: '#10b981',
  test: '#f59e0b',
  uncommon: '#3b82f6',
  fastHigh: '#facc15',
};

const LEGEND = [
  { color: FLAG_COLORS.emergency, label: 'Emergency' },
  { color: FLAG_COLORS.military, label: 'Military' },
  { color: FLAG_COLORS.fire, label: 'Firefighting' },
  { color: FLAG_COLORS.heli, label: 'Helicopter' },
  { color: FLAG_COLORS.test, label: 'Test flight' },
  { color: FLAG_COLORS.uncommon, label: 'Uncommon airline' },
  { color: FLAG_COLORS.fastHigh, label: 'Fast/high' },
  { color: DEFAULT_COLOR, label: 'Other' },
];

// Derived from the table badge class so new flag labels pick up a color automatically.
function flagColor(cls: string | undefined) {
  if (!cls) return DEFAULT_COLOR;
  if (cls.includes('red-600')) return FLAG_COLORS.emergency;
  if (cls.includes('red-200')) return FLAG_COLORS.tanker;
  if (cls.includes('red')) return FLAG_COLORS.military;
  if (cls.includes('orange')) return FLAG_COLORS.fire;
  if (cls.includes('emerald')) return FLAG_COLORS.heli;
  if (cls.includes('amber')) return FLAG_COLORS.test;
  if (cls.includes('blue')) return FLAG_COLORS.uncommon;
  if (cls.includes('yellow')) return FLAG_COLORS.fastHigh;
  return DEFAULT_COLOR;
}

function planeSvg(track: number, color: string, emergency: boolean) {
  const size = emergency ? 30 : 22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
    style="transform: rotate(${track}deg); transform-origin: 50% 50%;">
    <path d="M12 2c.6 0 1 .5 1 1.2V9l8 4.5v2l-8-2.4V18l2.5 1.8V21.5L12 20.6l-3.5.9V19.8L11 18v-4.9l-8 2.4v-2L11 9V3.2C11 2.5 11.4 2 12 2z"
      fill="${color}" stroke="${emergency ? '#fff' : '#1f2937'}" stroke-width="${emergency ? 1.2 : 0.8}"/>
  </svg>`;
  return emergency ? `<div class="flightmap-emergency">${svg}</div>` : svg;
}

function planeIcon(L: typeof import('leaflet'), html: string, emergency: boolean) {
  const size = emergency ? 30 : 22;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

export default function FlightMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    let cancelled = false;
    const toastTimers: ReturnType<typeof setTimeout>[] = [];

    function showToast(id: string, text: string) {
      setToasts(t => [...t.filter(x => x.id !== id), { id, text }]);
      toastTimers.push(setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), TOAST_MS));
    }

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

      // Trails sit under the planes.
      const trailLayer: LayerGroup = L.layerGroup().addTo(map);
      const planeLayer: LayerGroup = L.layerGroup().addTo(map);

      // Markers are updated in place by ICAO hex so open popups survive refreshes.
      const planes = new Map<string, { marker: LeafletMarker; iconHtml: string; trail: Polyline }>();
      const overhead = new Set<string>();

      async function refresh() {
        try {
          const res = await fetch('/api/flights');
          if (res.status === 204) return;
          const data = await res.json();
          const aircraft: Aircraft[] = (data.aircraft ?? []).filter(
            (f: Aircraft) =>
              f.hex && f.lat != null && f.lon != null && (f.seen ?? 0) <= STALE_AFTER_S
          );

          const current = new Set<string>();
          for (const f of aircraft) {
            const hex = f.hex!;
            const pos: [number, number] = [f.lat!, f.lon!];
            const cs = escapeHtml(f.flight?.trim() || 'No callsign');
            const alt = escapeHtml(f.alt_baro ?? f.alt_geom ?? '—');
            const note = classifyNotability(f);
            const flag = note?.label;
            const reason = emergencyReason(f);
            const airline = airlineFromFlight(f);
            const hasAirline = airline !== '—' && airline !== 'Undetermined';
            const color = flagColor(note?.cls);
            const tooltip = hasAirline ? `${cs} · ${escapeHtml(airline)}` : cs;
            const squawk = `${escapeHtml(f.squawk ?? '—')}${reason ? ` (${escapeHtml(reason)})` : ''}`;
            const popup = `<b>${cs}</b>${flag ? ` · ${escapeHtml(flag)}` : ''}${hasAirline ? `<br>${escapeHtml(airline)}` : ''}<br>ICAO: ${escapeHtml(hex)}<br>Alt: ${alt} ft<br>Speed: ${escapeHtml(f.gs ?? '—')} kt<br>Track: ${escapeHtml(f.track ?? '—')}°<br>Squawk: ${squawk}`;
            const iconHtml = planeSvg(Number(f.track) || 0, color, !!reason);

            current.add(hex);
            const existing = planes.get(hex);
            if (existing) {
              existing.marker.setLatLng(pos);
              existing.marker.setTooltipContent(tooltip);
              existing.marker.setPopupContent(popup);
              if (existing.iconHtml !== iconHtml) {
                existing.marker.setIcon(planeIcon(L, iconHtml, !!reason));
                existing.iconHtml = iconHtml;
              }
              const points = existing.trail.getLatLngs() as LatLng[];
              const last = points[points.length - 1];
              if (!last || last.lat !== pos[0] || last.lng !== pos[1]) {
                existing.trail.setLatLngs([...points, L.latLng(pos)].slice(-TRAIL_POINTS));
              }
              existing.trail.setStyle({ color });
            } else {
              const marker = L.marker(pos, { icon: planeIcon(L, iconHtml, !!reason) })
                .bindTooltip(tooltip, { direction: 'top', offset: [0, -10] })
                .bindPopup(popup)
                .addTo(planeLayer);
              const trail = L.polyline([pos], {
                color,
                weight: 2,
                opacity: 0.5,
                interactive: false,
              }).addTo(trailLayer);
              planes.set(hex, { marker, iconHtml, trail });
            }

            // Toast once each time a plane comes within range of the house.
            const isOverhead = distanceNm(RX_LAT, RX_LON, pos[0], pos[1]) <= OVERHEAD_NM;
            if (isOverhead && !overhead.has(hex)) {
              overhead.add(hex);
              const who = hasAirline ? `${f.flight?.trim()} · ${airline}` : f.flight?.trim() || 'Aircraft';
              const altText = typeof f.alt_baro === 'number' ? ` at ${f.alt_baro.toLocaleString()} ft` : '';
              showToast(hex, `${who} is directly overhead${altText}`);
            } else if (!isOverhead) {
              overhead.delete(hex);
            }
          }

          for (const [hex, { marker, trail }] of planes) {
            if (!current.has(hex)) {
              planeLayer.removeLayer(marker);
              trailLayer.removeLayer(trail);
              planes.delete(hex);
              overhead.delete(hex);
            }
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
      toastTimers.forEach(clearTimeout);
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div className="w-full max-w-[800px]">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        .flightmap-emergency { border-radius: 9999px; animation: flightmap-pulse 1.2s ease-out infinite; }
        @keyframes flightmap-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 31, 31, 0.7); }
          100% { box-shadow: 0 0 0 14px rgba(255, 31, 31, 0); }
        }
      `}</style>
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
      {toasts.length > 0 && (
        <div className="toast toast-end z-[1000]">
          {toasts.map(t => (
            <div key={t.id} className="alert alert-info shadow-lg">
              <span>✈️ {t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
