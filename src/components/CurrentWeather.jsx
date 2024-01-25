import React, { useState, useEffect } from 'react';

const CurrentWeather = () => {
    const [currentEmoji, setCurrentEmoji] = useState('');
    const [currentShortCondition, setCurrentShortCondition] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCurrentWeather = async () => {
            try {
                const response = await fetch('https://api.weather.gov/gridpoints/PUB/89,89/forecast');
                const data = await response.json();
                if (data.properties && data.properties.periods && data.properties.periods[0]) {
                    const shortForecast = data.properties.periods[0].shortForecast;
                    setCurrentEmoji(getWeatherEmoji(shortForecast));
                    setCurrentShortCondition(shortForecast);
                } else {
                    setCurrentEmoji('❓'); // Use a question mark emoji as a fallback
                    setCurrentShortCondition('Unknown'); // Use 'Unknown' as a fallback
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentWeather();
    }, []);

    const getWeatherEmoji = (shortForecast) => {
        if (shortForecast.includes("Snow")) return "❄️";
        if (shortForecast.includes("Rain") || shortForecast.includes("Showers")) return "🌧️";
        if (shortForecast.includes("Cloudy")) return "☁️";
        if (shortForecast.includes("Sunny") || shortForecast.includes("Clear")) return "☀️";
        return "🌤️"; // Default for other conditions
    };

    if (loading) return null; // Return null while loading
    if (error) return <p>Error loading current weather: {error}</p>;

    return (
        <div className="text-center">
            <h3 style={{ fontSize: '6rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{currentEmoji}</h3>
            <h3 style={{ fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: '20px' }}>{currentShortCondition}</h3>        </div>
    );
};

export default CurrentWeather;
