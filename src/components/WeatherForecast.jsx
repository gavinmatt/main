import React from 'react';

const forecastEmoji = (shortForecast) => {
    if (shortForecast.includes("Snow")) return "❄️";
    if (shortForecast.includes("Rain") || shortForecast.includes("Showers")) return "🌧️";
    if (shortForecast.includes("Cloudy")) return "☁️";
    if (shortForecast.includes("Sunny") || shortForecast.includes("Clear")) return "☀️";
    return "🌤️";
};

// A horizontal strip of NWS forecast periods, scrolling sideways on narrow screens.
const WeatherForecast = ({ periods }) => {
    if (!periods?.length) return null;

    return (
        <section className="rounded-box border border-base-300 bg-base-200 p-4 mt-4">
            <h2 className="text-sm font-bold uppercase tracking-wide opacity-70 mb-3">Forecast</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
                {periods.slice(0, 10).map((p) => (
                    <div key={p.number} className="flex-none w-28 rounded-box bg-base-100 p-3 text-center"
                        title={p.detailedForecast}>
                        <p className="text-xs font-semibold truncate">{p.name}</p>
                        <p className="text-3xl my-1" aria-hidden="true">{forecastEmoji(p.shortForecast)}</p>
                        <p className={`text-lg font-bold tabular-nums ${p.isDaytime ? '' : 'opacity-70'}`}>
                            {p.temperature}°
                        </p>
                        <p className="text-xs opacity-70 line-clamp-2 h-8">{p.shortForecast}</p>
                        <p className="text-xs mt-1 tabular-nums">💧 {p.probabilityOfPrecipitation?.value ?? 0}%</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export { forecastEmoji };
export default WeatherForecast;
