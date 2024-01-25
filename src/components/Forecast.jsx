import React, { useState, useEffect } from 'react';

const WeatherForecast = () => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                const response = await fetch('https://api.weather.gov/gridpoints/PUB/89,89/forecast');
                const data = await response.json();
                setForecast(data.properties.periods);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchForecast();
    }, []);

    if (loading) return <p>Loading forecast...</p>;
    if (error) return <p>Error loading forecast: {error.message}</p>;

    const currentConditions = forecast ? forecast[0] : null;
    const next24Hours = forecast ? forecast.slice(1, 3) : [];
    const longTermForecast = forecast ? forecast.slice(3) : [];

    return (
        <div>
            <h2>Current Conditions</h2>
            {currentConditions && (
                <div>
                    <p>{currentConditions.name}: {currentConditions.temperature}°{currentConditions.temperatureUnit}</p>
                    <p>{currentConditions.shortForecast}</p>
                </div>
            )}

            <h2>Next 24 Hours</h2>
            {next24Hours.map((period, index) => (
                <div key={index}>
                    <p>{period.name}: {period.temperature}°{period.temperatureUnit}</p>
                    <p>{period.shortForecast}</p>
                </div>
            ))}

            <h2>Long-Term Forecast</h2>
            {longTermForecast.map((period, index) => (
                <div key={index}>
                    <p>{period.name}: {period.temperature}°{period.temperatureUnit}</p>
                    <p>{period.shortForecast}</p>
                </div>
            ))}
        </div>
    );
};

export default WeatherForecast;
