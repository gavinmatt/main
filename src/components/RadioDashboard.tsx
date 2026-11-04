import { useEffect, useState } from 'react';
import QSLMap, { loadQSLData, type QSLData } from './QSLMap.tsx';

// US states laid out as a tile map: [abbr, column, row].
const STATE_TILES: [string, number, number][] = [
  ['AK', 0, 0], ['ME', 10, 0],
  ['VT', 9, 1], ['NH', 10, 1],
  ['WA', 0, 2], ['ID', 1, 2], ['MT', 2, 2], ['ND', 3, 2], ['MN', 4, 2], ['IL', 5, 2], ['WI', 6, 2], ['MI', 7, 2], ['NY', 8, 2], ['RI', 9, 2], ['MA', 10, 2],
  ['OR', 0, 3], ['NV', 1, 3], ['WY', 2, 3], ['SD', 3, 3], ['IA', 4, 3], ['IN', 5, 3], ['OH', 6, 3], ['PA', 7, 3], ['NJ', 8, 3], ['CT', 9, 3],
  ['CA', 0, 4], ['UT', 1, 4], ['CO', 2, 4], ['NE', 3, 4], ['MO', 4, 4], ['KY', 5, 4], ['WV', 6, 4], ['VA', 7, 4], ['MD', 8, 4], ['DE', 9, 4],
  ['AZ', 1, 5], ['NM', 2, 5], ['KS', 3, 5], ['AR', 4, 5], ['TN', 5, 5], ['NC', 6, 5], ['SC', 7, 5],
  ['OK', 3, 6], ['LA', 4, 6], ['MS', 5, 6], ['AL', 6, 6], ['GA', 7, 6],
  ['HI', 0, 7], ['TX', 3, 7], ['FL', 8, 7],
];
const PROVINCES = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'];

const TIER_CLS: Record<string, string> = {
  'Most wanted': 'bg-purple-100 text-purple-800',
  Rare: 'bg-indigo-100 text-indigo-800',
  Uncommon: 'bg-blue-100 text-blue-800',
};
const NEW_LABEL = { state: 'NEW STATE', province: 'NEW PROVINCE', entity: 'NEW ENTITY' };
const medals = ['🥇', '🥈', '🥉'];

function distanceLabel(mi: number): { label: string; cls: string } | null {
  if (mi >= 9000) return { label: 'EXTREME', cls: 'bg-purple-100 text-purple-800' };
  if (mi >= 7000) return { label: 'LONG-HAUL', cls: 'bg-indigo-100 text-indigo-800' };
  if (mi >= 4500) return { label: 'DISTANT', cls: 'bg-blue-100 text-blue-800' };
  return null;
}

// LoTW dates are YYYYMMDD.
function shortDate(ymd: string) {
  const d = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)));
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cls}`}>{label}</span>;
}

function Card({ title, aside, wide, children }: { title: string; aside?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={`dash-card${wide ? ' dash-wide' : ''}`}>
      <div className="dash-head">
        <h2 className="dash-title">{title}</h2>
        {aside && <span className="text-sm font-semibold text-base-content/70">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-6 text-base-content/50">
        {children}
      </td>
    </tr>
  );
}

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-sm" title={`${r.label}: ${r.count} QSL${r.count === 1 ? '' : 's'}`}>
          <span className="w-12 shrink-0 text-base-content/70">{r.label}</span>
          <span className="flex-1 h-3">
            <span className="block h-3 rounded-r bg-blue-500" style={{ width: `${Math.max(2, (r.count / max) * 100)}%` }} />
          </span>
          <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function RadioDashboard() {
  const [data, setData] = useState<QSLData | null>(null);
  const [error, setError] = useState(false);
  const [stateTip, setStateTip] = useState<string | null>(null);

  useEffect(() => {
    loadQSLData()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const workedStates = new Set(data?.states.map((s) => s.state));
  const workedProvinces = new Set(data?.provinces.map((p) => p.province));
  const stateNames = new Map(data?.states.map((s) => [s.state, s.name]));
  const loading = !data && !error;
  const placeholder = loading ? 'Loading…' : "Couldn't load QSLs from Logbook of the World.";

  const stats = [
    { value: data?.total, label: 'Confirmed QSLs' },
    { value: data?.entities, label: 'DXCC entities' },
    { value: data && `${data.states.length}/50`, label: 'US states' },
    { value: data && `${data.provinces.length}/13`, label: 'Provinces' },
    { value: data?.dxByDistance[0]?.distanceMi.toLocaleString(), label: 'Furthest (mi)' },
  ];

  return (
    <div className="dash-grid w-full">
      <div className="dash-wide grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          // Two to a row on phones, with the odd one out spanning the row.
          <div
            key={s.label}
            className={`rounded-lg border border-base-300 bg-base-100 px-3 py-2.5 ${i === stats.length - 1 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            <div className="text-2xl font-bold tabular-nums">{s.value ?? '—'}</div>
            <div className="text-xs text-base-content/60">{s.label}</div>
          </div>
        ))}
      </div>

      <Card title="Where I've reached" wide>
        <p className="dash-note">Every confirmed contact, grouped by US state, Canadian province, and DXCC entity.</p>
        <p className="dash-subnote">
          From Logbook of the World.
          {data && ` Updated ${new Date(data.updated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`}
        </p>
        <QSLMap data={data} />
      </Card>

      <Card title="Recent QSLs">
        <p className="dash-note">Newest confirmations first, flagged when one adds a state, province, or entity.</p>
        <p className="dash-subnote">Dated by when the QSL confirmed, which can be weeks after the contact.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-base-content">
            <thead>
              <tr className="border-b border-base-300 text-base-content/70">
                <th className="text-left py-2 px-1.5">Date</th>
                <th className="text-left py-2 px-1.5">Call</th>
                <th className="text-left py-2 px-1.5">Where</th>
                <th className="text-left py-2 px-1.5 hidden sm:table-cell">Band</th>
                <th className="text-left py-2 px-1.5 hidden sm:table-cell">Mode</th>
              </tr>
            </thead>
            <tbody>
              {!data && <EmptyRow cols={5}>{placeholder}</EmptyRow>}
              {data?.recent.map((q) => (
                <tr key={`${q.call}-${q.qsoDate}-${q.band}-${q.mode}`} className="border-b border-base-300">
                  <td className="py-2 px-1.5 whitespace-nowrap" title={`Contact on ${shortDate(q.qsoDate)}`}>
                    {shortDate(q.qslDate)}
                  </td>
                  <td className="py-2 px-1.5 font-medium">
                    {q.call}
                    <div className="sm:hidden text-xs text-base-content/50 font-normal">
                      {q.band} · {q.mode}
                    </div>
                  </td>
                  <td className="py-2 px-1.5">
                    <span className="mr-1.5">{q.region}</span>
                    {q.isNew && q.kind && <Badge label={NEW_LABEL[q.kind]} cls="bg-green-100 text-green-800" />}
                  </td>
                  <td className="py-2 px-1.5 hidden sm:table-cell">{q.band}</td>
                  <td className="py-2 px-1.5 hidden sm:table-cell">{q.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Worked All States" aside={data ? `${workedStates.size} of 50` : undefined}>
        <p className="dash-note">States confirmed so far, toward ARRL's Worked All States award.</p>
        <p className="dash-subnote">{stateTip ?? 'Hover or tap a state for its QSL count.'}</p>
        <div className="grid grid-cols-11 gap-0.5 sm:gap-1 max-w-md mx-auto">
          {STATE_TILES.map(([abbr, col, row]) => {
            const worked = workedStates.has(abbr);
            const count = data?.states.find((s) => s.state === abbr)?.count;
            const tip = worked ? `${stateNames.get(abbr)}: ${count} QSL${count === 1 ? '' : 's'}` : `${abbr}: not confirmed yet`;
            return (
              <div
                key={abbr}
                style={{ gridColumn: col + 1, gridRow: row + 1 }}
                onMouseEnter={() => setStateTip(tip)}
                onMouseLeave={() => setStateTip(null)}
                onClick={() => setStateTip(tip)}
                className={`aspect-square flex items-center justify-center rounded text-[10px] sm:text-xs font-semibold ${
                  worked ? 'bg-blue-500 text-white' : 'border border-dashed border-base-300 text-base-content/40'
                }`}
              >
                {abbr}
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-base-content/60 mb-1.5">
          Canadian provinces and territories · {data ? `${workedProvinces.size} of 13` : '—'}
        </div>
        <div className="flex flex-wrap gap-1">
          {PROVINCES.map((p) => (
            <span
              key={p}
              className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                workedProvinces.has(p) ? 'bg-green-500 text-white' : 'border border-dashed border-base-300 text-base-content/40'
              }`}
            >
              {p}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Rarest contacts">
        <p className="dash-note">Confirmed entities ranked by how hard they are to get.</p>
        <p className="dash-subnote">
          Rank is Club Log's worldwide Most Wanted list{data?.rankedEntities ? ` (1 = rarest of ${data.rankedEntities})` : ''}, updated
          weekly as DXpeditions come and go.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-base-content">
            <thead>
              <tr className="border-b border-base-300 text-base-content/70">
                <th className="text-right py-2 px-1.5 w-12">Rank</th>
                <th className="text-left py-2 px-1.5">Entity</th>
                <th className="text-left py-2 px-1.5">Rating</th>
                <th className="text-right py-2 px-1.5">QSLs</th>
              </tr>
            </thead>
            <tbody>
              {!data && <EmptyRow cols={4}>{placeholder}</EmptyRow>}
              {data && data.rare.length === 0 && <EmptyRow cols={4}>No ranked entities yet.</EmptyRow>}
              {data?.rare.slice(0, 10).map((d) => (
                <tr key={d.name} className="border-b border-base-300">
                  <td className="text-right py-2 px-1.5 font-semibold tabular-nums">#{d.rank}</td>
                  <td className="py-2 px-1.5">{d.name}</td>
                  <td className="py-2 px-1.5">{d.tier ? <Badge label={d.tier.toUpperCase()} cls={TIER_CLS[d.tier]} /> : '—'}</td>
                  <td className="text-right py-2 px-1.5">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Furthest contacts">
        <p className="dash-note">Great-circle distance from my attic EFHW antenna in Whitefish, MT.</p>
        <p className="dash-subnote">4,500+ miles = distant · 7,000+ = long-haul · 9,000+ = extreme</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-base-content">
            <thead>
              <tr className="border-b border-base-300 text-base-content/70">
                <th className="text-center py-2 px-1.5 w-8">
                  <span className="sr-only">Ranking</span>
                </th>
                <th className="text-left py-2 px-1.5">Rating</th>
                <th className="text-left py-2 px-1.5">Entity</th>
                <th className="text-right py-2 px-1.5">Miles</th>
              </tr>
            </thead>
            <tbody>
              {!data && <EmptyRow cols={4}>{placeholder}</EmptyRow>}
              {data?.dxByDistance.slice(0, 10).map((d, i) => {
                const label = distanceLabel(d.distanceMi);
                return (
                  <tr key={d.name} className="border-b border-base-300">
                    <td className="text-center py-2 px-1.5 text-lg">{medals[i] ?? ''}</td>
                    <td className="py-2 px-1.5">{label ? <Badge {...label} /> : '—'}</td>
                    <td className="py-2 px-1.5">{d.name}</td>
                    <td className="text-right py-2 px-1.5 font-semibold tabular-nums">{d.distanceMi.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Bands & modes" wide>
        <p className="dash-note">Where on the dial my confirmed contacts happened, and how.</p>
        <p className="dash-subnote">Confirmed QSLs per band (longest wavelength first) and per mode.</p>
        {!data ? (
          <p className="text-sm text-base-content/50 py-6 text-center">{placeholder}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold mb-2">Bands</h3>
              <Bars rows={data.bands.map((b) => ({ label: b.band.toLowerCase(), count: b.count }))} />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Modes</h3>
              <Bars rows={data.modes.map((m) => ({ label: m.mode, count: m.count }))} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
