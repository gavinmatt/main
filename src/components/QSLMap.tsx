import { useEffect, useRef, useState } from 'react';

interface StateEntry {
  state: string;
  count: number;
  lat: number;
  lon: number;
}

interface ProvinceEntry {
  province: string;
  count: number;
  lat: number;
  lon: number;
}

interface DXEntry {
  country: string;
  count: number;
  lat: number;
  lon: number;
  distanceMi: number;
}

interface DXDistanceEntry {
  country: string;
  distanceMi: number;
  count: number;
}

interface MapData {
  states: StateEntry[];
  provinces: ProvinceEntry[];
  dx: DXEntry[];
  dxByDistance: DXDistanceEntry[];
  total: number;
  updated: string;
}

function distanceLabel(mi: number): { label: string; cls: string } | null {
  if (mi >= 9000) return { label: 'EXTREME', cls: 'bg-purple-100 text-purple-800' };
  if (mi >= 7000) return { label: 'LONG-HAUL', cls: 'bg-indigo-100 text-indigo-800' };
  if (mi >= 4500) return { label: 'DISTANT', cls: 'bg-blue-100 text-blue-800' };
  return null;
}

function toProperCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Entities considered rare/notable — keyed by LOTW COUNTRY string (uppercase)
// Sourced from Club Log Most Wanted + generally recognized difficult entities
const RARE_ENTITIES: Record<string, { reason: string; rank?: number }> = {
  'ALASKA':                 { reason: 'US territory — counts as separate DXCC entity' },
  'ARGENTINA':              { reason: 'South America — long path from Montana' },
  'ARUBA':                  { reason: 'Caribbean DX' },
  'ASIATIC RUSSIA':         { reason: 'Vast, sparsely populated region' },
  'AUSTRALIA':              { reason: 'Club Log Top 50 path difficulty from NA' },
  'BARBADOS':               { reason: 'Caribbean DX' },
  'BOUVET ISLAND':          { reason: 'Club Log Top 10 most wanted' },
  'CANARY ISLANDS':         { reason: 'Atlantic islands — propagation gateway' },
  'CAPE VERDE':             { reason: 'Remote Atlantic island chain' },
  'CROZET ISLAND':          { reason: 'Club Log Top 30 most wanted' },
  'DOMINICAN REPUBLIC':     { reason: 'Caribbean DX' },
  'GALAPAGOS ISLANDS':      { reason: 'Club Log Top 100', rank: 71 },
  'GUINEA-BISSAU':          { reason: 'West Africa — infrequently active' },
  'HAWAII':                 { reason: 'US territory — counts as separate DXCC entity' },
  'HEARD ISLAND':           { reason: 'Club Log Top 20 most wanted' },
  'JAPAN':                  { reason: 'Transpacific — long path DX' },
  'KERGUELEN ISLAND':       { reason: 'Club Log Top 10 most wanted' },
  'MACQUARIE ISLAND':       { reason: 'Club Log Top 15 most wanted' },
  'MADEIRA ISLANDS':        { reason: 'Remote Atlantic — occasional activity' },
  'MAURITIUS':              { reason: 'Indian Ocean — rare from North America' },
  'NEW ZEALAND':            { reason: 'Transpacific — among furthest workable entities' },
  'PETER 1 ISLAND':         { reason: 'Club Log Top 10 most wanted' },
  'PORTUGAL':               { reason: 'Southern Europe — propagation dependent' },
  'REUNION ISLAND':         { reason: 'Indian Ocean — rare from North America' },
  'SAINT LUCIA':            { reason: 'Caribbean DX' },
  'SOUTH AFRICA':           { reason: 'Long path Africa — rare from inland NA' },
};

const HOME_LAT = 48.4716;
const HOME_LON = -114.3355;

export default function QSLMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'distance' | 'rare'>('map');

  useEffect(() => {
    fetch('/api/qsl-map')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)));
  }, []);

  useEffect(() => {
    if (!data || !mapRef.current || mapInstance.current) return;

    import('leaflet').then(L => {
      const map = L.map(mapRef.current!, {
        center: [30, -30],
        zoom: 2,
        minZoom: 1,
        worldCopyJump: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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
      L.marker([HOME_LAT, HOME_LON], { icon: homeIcon })
        .addTo(map)
        .bindPopup('<b>Whitefish, MT</b>');

      const allCounts = [
        ...(data.states ?? []).map(s => s.count),
        ...(data.provinces ?? []).map(p => p.count),
        ...(data.dx ?? []).map(d => d.count),
        1,
      ];
      const maxCount = Math.max(...allCounts);
      const radius = (count: number) => Math.max(7, Math.sqrt(count / maxCount) * 36);

      for (const s of (data.states ?? [])) {
        const ll = map.wrapLatLng(L.latLng(s.lat, s.lon));
        L.circleMarker(ll, {
          radius: radius(s.count),
          fillColor: '#3b82f6',
          color: '#1d4ed8',
          weight: 1,
          fillOpacity: 0.75,
        }).addTo(map).bindPopup(`<b>${s.state}</b><br>${s.count} QSL${s.count !== 1 ? 's' : ''}`);
      }

      for (const p of (data.provinces ?? [])) {
        const ll = map.wrapLatLng(L.latLng(p.lat, p.lon));
        L.circleMarker(ll, {
          radius: radius(p.count),
          fillColor: '#22c55e',
          color: '#15803d',
          weight: 1,
          fillOpacity: 0.75,
        }).addTo(map).bindPopup(`<b>${p.province}</b><br>${p.count} QSL${p.count !== 1 ? 's' : ''}`);
      }

      for (const d of (data.dx ?? [])) {
        const ll = map.wrapLatLng(L.latLng(d.lat, d.lon));
        L.circleMarker(ll, {
          radius: radius(d.count),
          fillColor: '#f59e0b',
          color: '#b45309',
          weight: 1,
          fillOpacity: 0.75,
        }).addTo(map).bindPopup(`<b>${toProperCase(d.country)}</b><br>${d.count} QSL${d.count !== 1 ? 's' : ''}`);
      }

      mapInstance.current = map;
    });
  }, [data]);

  // Rare contacts: intersection of confirmed DX and RARE_ENTITIES table
  const rareContacts = data
  ? (data.dx ?? [])
      .filter(d => RARE_ENTITIES[d.country])
      .map(d => ({
        ...d,
        ...RARE_ENTITIES[d.country],
      }))
      .sort((a, b) => a.country.localeCompare(b.country))
  : [];

  if (error) return <div className="text-red-500">Failed to load QSL data: {error}</div>;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-3">
      {data && (
        <div className="flex flex-wrap gap-6 text-sm text-base-content/70 items-center">
          <span><b>{data.states?.length ?? 0}</b> US states</span>
          <span><b>{data.provinces?.length ?? 0}</b> Canadian provinces</span>
          <span><b>{data.dx?.length ?? 0}</b> DX entities</span>
          <span><b>{data.total}</b> total QSLs</span>
          <span className="ml-auto opacity-50 text-xs">
            Updated {new Date(data.updated).toLocaleString()}
          </span>
        </div>
      )}

      <div className="flex border-b border-gray-300 gap-1">
        {(['map', 'distance', 'rare'] as const).map(tab => (
          <button
            key={tab}
            className={`px-5 py-2.5 text-base font-bold border-b-2 -mb-px ${activeTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'map' ? 'Map' : tab === 'distance' ? 'Distant QSLs' : 'Rare Contacts'}
          </button>
        ))}
      </div>

      {/* Fixed-height container prevents layout shift on all tabs */}
      <div style={{ minHeight: '580px' }}>

        {activeTab === 'map' && (
          <>
            {!data && <div className="text-base-content/50 animate-pulse">Loading QSL data...</div>}
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <div
              ref={mapRef}
              style={{ height: '70vh', minHeight: '500px', width: '100%' }}
              className="rounded-lg overflow-hidden border border-base-300"
            />
            <div className="flex gap-4 text-xs text-base-content/50 mt-2">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> US states
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Canadian provinces
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-500" /> DX entities
              </span>
              <span className="ml-auto">Bubble size = QSL count</span>
            </div>
          </>
        )}

        {activeTab === 'distance' && (
          <div className="pt-4">
            <p className="text-gray-900 mb-1 text-base">
              Furthest confirmed DX QSLs by great-circle distance from my home EFHW attic antenna in Whitefish, MT.
            </p>
            <p className="text-gray-500 mb-4 text-sm">
              4,500+ miles = distant · 7,000+ miles = long-haul · 9,000+ miles = extreme
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-base text-gray-900">
                <thead>
                  <tr className="border-b text-gray-700">
                    <th className="text-center py-2 px-3">Rank</th>
                    <th className="text-center py-2 px-3">Rating</th>
                    <th className="text-left py-2 px-3">Entity</th>
                    <th className="text-right py-2 px-3">Distance (Miles)</th>
                    <th className="text-right py-2 px-3">QSLs</th>
                  </tr>
                </thead>
                <tbody>
                  {!data && (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-500">Loading...</td></tr>
                  )}
                  {data && (data.dxByDistance ?? []).map((d, i) => {
                    const label = distanceLabel(d.distanceMi);
                    return (
                      <tr key={d.country} className="border-b">
                        <td className="text-center py-2 px-3 text-xl">{medals[i] ?? ''}</td>
                        <td className="text-center py-2 px-3">
                          {label
                            ? <span className={`px-2 py-0.5 rounded text-xs font-medium ${label.cls}`}>{label.label}</span>
                            : '—'}
                        </td>
                        <td className="py-2 px-3">{toProperCase(d.country)}</td>
                        <td className="text-right py-2 px-3 font-semibold">{d.distanceMi.toLocaleString()}</td>
                        <td className="text-right py-2 px-3">{d.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rare' && (
          <div className="pt-4">
            <p className="text-gray-900 mb-1 text-base">
              Confirmed QSLs with notable or difficult-to-reach entities (rare areas).
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-base text-gray-900">
                <thead>
                  <tr className="border-b text-gray-700">
                    <th className="text-left py-2 px-3">Entity</th>
                    <th className="text-left py-2 px-3">Why It's Notable</th>
                    <th className="text-right py-2 px-3">QSL Count</th>
                  </tr>
                </thead>
                <tbody>
                  {!data && (
                    <tr><td colSpan={3} className="text-center py-6 text-gray-500">Loading...</td></tr>
                  )}
                  {data && rareContacts.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-6 text-gray-500">No rare contacts confirmed yet.</td></tr>
                  )}
                  {data && rareContacts.map(d => (
                    <tr key={d.country} className="border-b">
                      <td className="py-2 px-3 font-medium">{toProperCase(d.country)}</td>
                      <td className="py-2 px-3 text-gray-500 text-sm">{d.reason}</td>
                      <td className="text-right py-2 px-3">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}