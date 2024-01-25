import React, { useEffect, useState } from 'react';
import Temperature from './Temperature.jsx';
import WindSpeed from './WindSpeed.jsx';
import WindDirection from './WindDirection.jsx';
import RainHour from './RainHour.jsx';
import RainDay from './RainDay.jsx';
import RainYear from './RainYear.jsx';
import FeelsLike from './FeelsLike.jsx';
import Humidity from './Humidity.jsx';
import Pressure from './Pressure.jsx';
import WeatherForecast from './WeatherForecast.jsx';

const WeatherDashboard = ({ apiEndpoint }) => {
    const [weatherData, setWeatherData] = useState(null);
    const [dataDate, setDataDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(apiEndpoint);
                const data = await response.json();
                setWeatherData(data);

                if (data && data.length > 0) {
                    const date = new Date(data[0].lastData.date);
                    setDataDate(date.toLocaleString('en-US', { timeZone: 'America/Denver' }));
                }
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiEndpoint]);

    const getWeatherEmoji = (shortForecast) => {
        if (shortForecast.includes("Snow")) return "❄️";
        if (shortForecast.includes("Rain") || shortForecast.includes("Showers")) return "🌧️";
        if (shortForecast.includes("Cloudy")) return "☁️";
        if (shortForecast.includes("Sunny") || shortForecast.includes("Clear")) return "☀️";
        return "🌤️"; // Default for other conditions
    };

    if (loading) return <p className="text-center">Loading weather data...</p>;
    if (error) return <p className="text-center">Error loading data: {error.message}</p>;

    const currentConditions = weatherData ? weatherData[0].lastData : null;

    return (
        <div>
            {dataDate && <p className="text-center pb-5"><b>Weather data pulled at:</b> {dataDate} (Mountain Time)</p>}
            {currentConditions && (
                <h3 className="text-center">{getWeatherEmoji(currentConditions.shortForecast)}</h3>
            )}

            <p className="text-center pb-1"><b>Current Weather 🌤</b></p>

            <div className="lg:flex justify-center items-center gap-4 pb-4">
                {weatherData && <Temperature data={weatherData} />}
                {weatherData && <WindSpeed data={weatherData} />}
                {weatherData && <WindDirection data={weatherData} />}
            </div>

            <div className="lg:flex justify-center items-center gap-4 pb-5">
                {weatherData && <FeelsLike data={weatherData} />}
                {weatherData && <Humidity data={weatherData} />}
                {weatherData && <Pressure data={weatherData} />}
            </div>

            <p className="text-center pb-1"><b>Precipitation Totals 🌧</b></p>

            <div className="lg:flex justify-center items-center gap-4">
                {weatherData && <RainHour data={weatherData} />}
                {weatherData && <RainDay data={weatherData} />}
                {weatherData && <RainYear data={weatherData} />}
            </div>

            <WeatherForecast />
        </div>
    );
};

export default WeatherDashboard;
