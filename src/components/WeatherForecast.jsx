import React, { useState, useEffect } from 'react';
import './WeatherForecast.css'; // Ensure this CSS file is correctly linked

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
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchForecast();
    }, []);

    const getWeatherEmoji = (shortForecast) => {
        if (shortForecast.includes("Snow")) return "❄️";
        if (shortForecast.includes("Rain") || shortForecast.includes("Showers")) return "🌧️";
        if (shortForecast.includes("Cloudy")) return "☁️";
        if (shortForecast.includes("Sunny") || shortForecast.includes("Clear")) return "☀️";
        return "🌤️"; // Default for other conditions
    };

    if (loading) return <p>Loading forecast...</p>;
    if (error) return <p>Error loading forecast: {error}</p>;

    // Adjusted to start the forecast from the next 24 hours
    const next24Hours = forecast ? forecast.slice(0, 2) : [];
    const next3Days = forecast ? forecast.slice(2, 5) : []; // Forecast for the next 3 days beyond 24 hours

    return (
        <div className="forecast-container">
            <h2 className="forecast-header">Forecast</h2>
            <div className="forecast-row">
                {[...next24Hours, ...next3Days].map((period, index) => (
                    <div key={index} className="forecast-box">
                        <p className="forecast-day">{period.name}</p>
                        <p className="forecast-emoji">{getWeatherEmoji(period.shortForecast)}</p>
                        <p className="forecast-temperature">{period.temperature}°{period.temperatureUnit}</p>
                        <p>{period.shortForecast}</p>
                        <p>Precipitation: {period.detailedForecast.match(/(\d+\.\d+ inches)|(\d+ inches)|(\d+\.\d+ cm)|(\d+ cm)/g) || 'None'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherForecast;
