import React, { useState, useEffect } from 'react';
import './WeatherForecast.css'; // Ensure to create this CSS file

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
                setError(err.message); // Storing the error message
            } finally {
                setLoading(false);
            }
        };

        fetchForecast();
    }, []);

    if (loading) return <p>Loading forecast...</p>;
    if (error) return <p>Error loading forecast: {error}</p>;

    const currentConditions = forecast && forecast[0];
    const next24Hours = forecast && forecast.slice(1, 3);
    const longTermForecast = forecast && forecast.slice(3);

    return (
        <div className="forecast-container">
            {/* ... rest of your component ... */}
        </div>
    );
};

export default WeatherForecast;
