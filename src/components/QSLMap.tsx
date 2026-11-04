import { useEffect, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';

export interface QSLData {
  states: { state: string; name: string; count: number; lat: number; lon: number; entity: boolean }[];
  provinces: { province: string; name: string; count: number; lat: number; lon: number }[];
  dx: { name: string; count: number; lat: number; lon: number; distanceMi: number }[];
  dxByDistance: { name: string; distanceMi: number; count: number; continent: string | null }[];
  rare: { name: string; rank: number; tier: string | null; count: number; distanceMi: number }[];
  rankedEntities: number;
  entities: number;
  continents: { code: string; name: string; count: number }[];
  zones: Record<string, number>;
  hours: number[];
  confirmDays: { median: number; fastest: number; slowest: number } | null;
  recent: {
    call: string;
    band: string;
    mode: string;
    qsoDate: string;
    qslDate: string;
    region: string;
    kind: 'state' | 'province' | 'entity' | null;
    isNew: boolean;
  }[];
  total: number;
  updated: string;
}

const HOME_LAT = 48.41;
const HOME_LON = -114.444;

// Fetches the QSL summary once per page, however many components ask for it.
let qslRequest: Promise<QSLData> | null = null;
export function loadQSLData() {
  qslRequest ??= fetch('/api/qsl-map').then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<QSLData>;
  });
  return qslRequest;
}

// Without `data` the map loads its own (as in the blog post); the radio dashboard passes
// what it already fetched, with null while that's loading.
export default function QSLMap({ data: givenData }: { data?: QSLData | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<LeafletMap | null>(null);
  const markers = useRef<LayerGroup | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const [ownData, setOwnData] = useState<QSLData | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const data = givenData !== undefined ? givenData : ownData;

  useEffect(() => {
    if (givenData !== undefined) return;
    loadQSLData()
      .then(setOwnData)
      .catch((e) => setError(String(e)));
  }, []);

  // The map and its tiles start loading straight away rather than after the QSLs arrive.
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current || mapInstance.current) return;
      leaflet.current = L;
      const map = L.map(mapRef.current, {
        center: [30, -30],
        // A phone-width map at zoom 2 shows little more than the Americas.
        zoom: mapRef.current.clientWidth < 640 ? 1 : 2,
        minZoom: 1,
        worldCopyJump: true,
        // The page scrolls past this card; zoom with the buttons or a pinch.
        scrollWheelZoom: false,
      });
      mapInstance.current = map;

      L.tileLayer(`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.PUBLIC_CARTO_API_KEY}`, {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
      }).addTo(map);

      const homeIcon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
          <path d="M12 0C7.6 0 4 3.6 4 8c0 6 8 18 8 18s8-12 8-18c0-4.4-3.6-8-8-8z" fill="#ef4444" stroke="#fff" stroke-width="1.5"/>
          <circle cx="12" cy="8" r="3.5" fill="#fff"/>
        </svg>`,
        className: '',
        iconSize: [24, 32],
        iconAnchor: [12, 32], // tip of pin = exact coordinate
        popupAnchor: [0, -32],
      });
      L.marker([HOME_LAT, HOME_LON], { icon: homeIcon }).addTo(map).bindPopup('<b>Whitefish, MT</b>');
      markers.current = L.layerGroup().addTo(map);
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leaflet.current;
    const map = mapInstance.current;
    if (!data || !L || !map || !markers.current) return;
    markers.current.clearLayers();

    const maxCount = Math.max(1, ...[...data.states, ...data.provinces, ...data.dx].map((p) => p.count));
    const radius = (count: number) => Math.max(7, Math.sqrt(count / maxCount) * 36);
    const groups = [
      // Alaska and Hawaii are drawn once, as the DX entities they are.
      { points: data.states.filter((s) => !s.entity), fill: '#3b82f6', stroke: '#1d4ed8' },
      { points: data.provinces, fill: '#22c55e', stroke: '#15803d' },
      { points: data.dx, fill: '#f59e0b', stroke: '#b45309' },
    ];
    for (const { points, fill, stroke } of groups) {
      for (const p of points) {
        L.circleMarker(map.wrapLatLng(L.latLng(p.lat, p.lon)), {
          radius: radius(p.count),
          fillColor: fill,
          color: stroke,
          weight: 1,
          fillOpacity: 0.75,
        })
          .addTo(markers.current)
          .bindPopup(`<b>${p.name}</b><br>${p.count} QSL${p.count !== 1 ? 's' : ''}`);
      }
    }
  }, [data, mapReady]);

  return (
    <div className="w-full">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="h-[360px] sm:h-[520px] w-full rounded-lg overflow-hidden border border-base-300" />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/50 mt-2">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> US states
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Canadian provinces
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500" /> DX entities
        </span>
        <span className="ml-auto">
          {error ? <span className="text-error">Couldn't load QSLs</span> : data ? 'Bubble size = QSL count' : 'Loading QSLs…'}
        </span>
      </div>
    </div>
  );
}
