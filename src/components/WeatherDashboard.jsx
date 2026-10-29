import React, { useEffect, useMemo, useState } from 'react';
import WeatherAlerts from './WeatherAlerts.jsx';
import WeatherForecast, { forecastEmoji } from './WeatherForecast.jsx';
import WeatherTrendChart from './WeatherTrendChart.jsx';
import WindCompass, { compassPoint } from './WindCompass.jsx';
import { wetBulbF, precipType } from '../lib/wetBulb.js';
import { sunTimes } from '../lib/sun.js';

const TZ = 'America/Denver';
const STATION = { lat: 48.43, lon: -114.4755 };
const FORECAST_URL = 'https://api.weather.gov/gridpoints/MSO/101,206/forecast';
const STATION_REFRESH_MS = 2 * 60 * 1000;
const FORECAST_REFRESH_MS = 30 * 60 * 1000;
const HOUR_MS = 3600000;

const num = (v, digits = 0) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits));
const localDay = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ });
const clock = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });

const ago = (ms, now) => {
    const minutes = Math.max(0, Math.round((now - ms) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours} h ago`;
    return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });
};

const uvCategory = (uv) => {
    if (uv == null) return '';
    if (uv < 3) return 'Low';
    if (uv < 6) return 'Moderate';
    if (uv < 8) return 'High';
    if (uv < 11) return 'Very high';
    return 'Extreme';
};

// Change over the last three hours, the window forecasters use for tendency.
const pressureTrend = (current, history) => {
    const target = current.dateutc - 3 * HOUR_MS;
    const then = history.reduce(
        (best, r) => (Math.abs(r.dateutc - target) < Math.abs((best?.dateutc ?? Infinity) - target) ? r : best),
        null
    );
    if (!then || Math.abs(then.dateutc - target) > HOUR_MS / 2 || then.baromabsin == null) return null;
    const change = current.baromabsin - then.baromabsin;
    if (Math.abs(change) < 0.02) return { arrow: '→', text: 'Steady', change };
    return change > 0 ? { arrow: '↑', text: 'Rising', change } : { arrow: '↓', text: 'Falling', change };
};

const Card = ({ title, className = '', children }) => (
    <section className={`rounded-box border border-base-300 bg-base-200 p-4 ${className}`}>
        <h2 className="text-sm font-bold uppercase tracking-wide opacity-70 mb-3">{title}</h2>
        {children}
    </section>
);

const Stat = ({ label, value, sub }) => (
    <div>
        <p className="text-xs uppercase tracking-wide opacity-60">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
);

const WeatherDashboard = ({ apiEndpoint }) => {
    const [station, setStation] = useState(null);
    const [periods, setPeriods] = useState(null);
    const [error, setError] = useState(null);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const fetchStation = async () => {
            try {
                const response = await fetch(apiEndpoint);
                if (!response.ok) throw new Error(`status ${response.status}`);
                setStation(await response.json());
                setError(null);
            } catch (err) {
                setError(err);
            }
        };
        fetchStation();
        const timer = setInterval(fetchStation, STATION_REFRESH_MS);
        return () => clearInterval(timer);
    }, [apiEndpoint]);

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                const response = await fetch(FORECAST_URL);
                const data = await response.json();
                if (data.properties?.periods) setPeriods(data.properties.periods);
            } catch {
                // The forecast is optional; station data still renders.
            }
        };
        fetchForecast();
        const timer = setInterval(fetchForecast, FORECAST_REFRESH_MS);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    const derived = useMemo(() => {
        if (!station) return null;
        const { current, history } = station;
        const rows = [...history].sort((a, b) => a.dateutc - b.dateutc);
        if (!rows.length || rows[rows.length - 1].dateutc < current.dateutc) rows.push(current);

        const today = localDay(current.dateutc);
        const todayTemps = rows.filter((r) => localDay(r.dateutc) === today && r.tempf != null).map((r) => r.tempf);
        const series = (label, key, slot) => ({
            label,
            slot,
            points: rows.filter((r) => r[key] != null).map((r) => ({ x: r.dateutc, y: r[key] })),
        });
        const wetBulb = wetBulbF(current.tempf, current.humidity, current.baromabsin);
        const sun = sunTimes(new Date(current.dateutc), STATION.lat, STATION.lon);
        const dayMinutes = Math.round((sun.sunset - sun.sunrise) / 60000);

        return {
            current,
            high: todayTemps.length ? Math.max(...todayTemps) : null,
            low: todayTemps.length ? Math.min(...todayTemps) : null,
            wetBulb,
            precip: precipType(wetBulb),
            trend: pressureTrend(current, rows),
            sun,
            dayLength: `${Math.floor(dayMinutes / 60)} h ${dayMinutes % 60} min`,
            tempSeries: [series('Temperature', 'tempf', 1), series('Dew point', 'dewPoint', 0)],
            windSeries: [series('Wind', 'windspeedmph'), series('Gust', 'windgustmph')],
            pressureSeries: [series('Pressure', 'baromabsin')],
        };
    }, [station]);

    if (!derived) {
        return error
            ? <p className="text-center">Error loading data: {error.message}</p>
            : <p className="text-center">Loading weather data...</p>;
    }

    const { current: c } = derived;
    const condition = periods?.[0];
    const calm = !c.windspeedmph && !c.windgustmph;

    return (
        <div>
            <WeatherAlerts />

            <section className="rounded-box border border-base-300 bg-base-200 p-6 mb-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-center">
                <div>
                    <p className="text-7xl font-bold tabular-nums leading-none">{num(c.tempf)}°</p>
                    <p className="opacity-70 mt-2">Feels like {num(c.feelsLike)}°</p>
                </div>
                {condition && (
                    <div>
                        <p className="text-6xl" aria-hidden="true">{forecastEmoji(condition.shortForecast)}</p>
                        <p className="text-xl font-semibold mt-1">{condition.shortForecast}</p>
                    </div>
                )}
                <p className="basis-full text-xs opacity-60">
                    Station reading {ago(c.dateutc, now)} · updates every 2 minutes
                </p>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
                <Card title="Temperature & Humidity">
                    <div className="grid grid-cols-3 gap-3">
                        <Stat label="High" value={`${num(derived.high)}°`} />
                        <Stat label="Low" value={`${num(derived.low)}°`} />
                        <Stat label="Humidity" value={`${num(c.humidity)}%`} />
                        <Stat label="Dew point" value={`${num(c.dewPoint)}°`} />
                        <Stat label="Wet bulb" value={`${num(derived.wetBulb, 1)}°`} />
                    </div>
                    <WeatherTrendChart series={derived.tempSeries} unit="°" />
                </Card>

                <Card title="Wind">
                    <div className="flex items-center gap-4">
                        <WindCompass degrees={c.winddir_avg10m ?? c.winddir} calm={calm} />
                        <div className="grid grid-cols-2 gap-3 flex-1">
                            <Stat label="Speed" value={`${num(c.windspeedmph)} mph`}
                                sub={calm ? 'Calm' : `from ${compassPoint(c.winddir_avg10m ?? c.winddir)}`} />
                            <Stat label="Gust" value={`${num(c.windgustmph)} mph`} />
                            <Stat label="Peak gust today" value={`${num(c.maxdailygust)} mph`} />
                        </div>
                    </div>
                    <WeatherTrendChart series={derived.windSeries} unit=" mph" />
                </Card>

                <Card title="Precipitation">
                    {derived.precip && (
                        <div className="rounded-box bg-base-100 p-3 mb-3">
                            <p className="text-xs uppercase tracking-wide opacity-60">Precip would fall as</p>
                            <p className="text-2xl font-bold">{derived.precip.text} {derived.precip.emoji}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                        <Stat label="Rate" value={`${num(c.hourlyrainin, 2)}″/h`} />
                        <Stat label="Today" value={`${num(c.dailyrainin, 2)}″`} />
                        <Stat label="This storm" value={`${num(c.eventrainin, 2)}″`} />
                        <Stat label="Week" value={`${num(c.weeklyrainin, 2)}″`} />
                        <Stat label="Month" value={`${num(c.monthlyrainin, 2)}″`} />
                        <Stat label="Year" value={`${num(c.yearlyrainin, 2)}″`} />
                    </div>
                    {c.lastRain && (
                        <p className="text-xs opacity-60 mt-3">Last rain {ago(Date.parse(c.lastRain), now)}</p>
                    )}
                </Card>

                <Card title="Pressure">
                    <div className="grid grid-cols-2 gap-3">
                        <Stat label="Station pressure" value={`${num(c.baromabsin, 2)} inHg`} />
                        {derived.trend && (
                            <Stat label="3-hour trend" value={`${derived.trend.arrow} ${derived.trend.text}`}
                                sub={`${derived.trend.change >= 0 ? '+' : ''}${derived.trend.change.toFixed(2)} inHg`} />
                        )}
                    </div>
                    <WeatherTrendChart series={derived.pressureSeries} unit="" digits={2} />
                </Card>

                <Card title="Sun" className="md:col-span-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <Stat label="Sunrise" value={clock(derived.sun.sunrise)} />
                        <Stat label="Sunset" value={clock(derived.sun.sunset)} />
                        <Stat label="Daylight" value={derived.dayLength} />
                        <Stat label="UV index" value={num(c.uv)} sub={uvCategory(c.uv)} />
                        <Stat label="Solar radiation" value={`${num(c.solarradiation)} W/m²`} />
                    </div>
                </Card>
            </div>

            <WeatherForecast periods={periods} />
        </div>
    );
};

export default WeatherDashboard;
