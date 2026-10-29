import React, { useEffect, useState } from 'react';

const ALERTS_URL = 'https://api.weather.gov/alerts/active?point=48.43,-114.4755';
const REFRESH_MS = 5 * 60 * 1000;

const SEVERITY_CLASS = {
    Extreme: 'alert-error',
    Severe: 'alert-error',
    Moderate: 'alert-warning',
};

const formatEnds = (iso) =>
    new Date(iso).toLocaleString('en-US', {
        weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver',
    });

// Active NWS watches, warnings, and advisories for the station. Renders nothing when quiet.
const WeatherAlerts = () => {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await fetch(ALERTS_URL);
                const data = await response.json();
                setAlerts((data.features || []).map((f) => f.properties));
            } catch {
                // Keep whatever we last showed.
            }
        };
        fetchAlerts();
        const timer = setInterval(fetchAlerts, REFRESH_MS);
        return () => clearInterval(timer);
    }, []);

    if (!alerts.length) return null;

    return (
        <div className="flex flex-col gap-2 mb-4">
            {alerts.map((a) => (
                <div key={a.id} role="alert" className={`alert ${SEVERITY_CLASS[a.severity] || 'alert-info'} block`}>
                    <details>
                        <summary className="cursor-pointer">
                            <b>⚠️ {a.event}</b>
                            {(a.ends || a.expires) && <span> until {formatEnds(a.ends || a.expires)}</span>}
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-sm">{a.description}</p>
                        {a.instruction && <p className="mt-2 whitespace-pre-line text-sm"><b>What to do:</b> {a.instruction}</p>}
                    </details>
                </div>
            ))}
        </div>
    );
};

export default WeatherAlerts;
