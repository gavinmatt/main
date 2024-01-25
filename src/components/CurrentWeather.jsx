import React, { useState, useEffect } from 'react';

const CurrentWeather = () => {
    const [currentCondition, setCurrentCondition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCurrentCondition = async () => {
            try {
                const response = await fetch('https://api.weather.gov/gridpoints/PUB/89,89/forecast');
                const data = await response.json();
                // Assuming the current condition is in the first element of the forecast array
                const currentCondition = data.properties.periods[0].shortForecast;
                setCurrentCondition(currentCondition);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentCondition();
    }, []);

    const getWeatherEmoji = (shortForecast) => {
        if (shortForecast.includes("Snow")) return "❄️";
        if (shortForecast.includes("Rain") || shortForecast.includes("Showers")) return "🌧️";
        if (shortForecast.includes("Cloudy")) return "☁️";
        if (shortForecast.includes("Sunny") || shortForecast.includes("Clear")) return "☀️";
        return "🌤️"; // Default for other conditions
    };

    if (loading) return <p>Loading current weather condition...</p>;
    if (error) return <p>Error loading weather condition: {error}</p>;

    const emoji = getWeatherEmoji(currentCondition);

    return (
        <div>
            <h2>Current Weather</h2>
            <p className="emoji">{emoji}</p>
        </div>
    );
};

export default CurrentWeather;
