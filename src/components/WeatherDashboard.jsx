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

const getWeatherEmoji = (shortForecast) => {
    if (shortForecast.includes("Snow")) return "❄️";
    if (shortForecast.includes("Rain") || shortForecast.includes("Showers")) return "🌧️";
    if (shortForecast.includes("Cloudy")) return "☁️";
    if (shortForecast.includes("Sunny") || shortForecast.includes("Clear")) return "☀️";
    return "🌤️"; // Default for other conditions
};

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

    const getTemperatureHeader = (temp) => {
        if (temp <= 32) return { text: "Freezing", emoji: "🥶" };
        if (temp > 32 && temp <= 50) return { text: "Cold", emoji: "❄️" };
        if (temp > 50 && temp <= 75) return { text: "Perfect", emoji: "😎" };
        if (temp > 75 && temp <= 90) return { text: "Warm", emoji: "🌶" };
        return { text: "Hot", emoji: "🔥" };
    };

    if (loading) return <p className="text-center">Loading weather data...</p>;
    if (error) return <p className="text-center">Error loading data: {error.message}</p>;

    let headerContent = weatherData ? getTemperatureHeader(weatherData[0].lastData.tempf) : { text: "", emoji: "" };

    return (
        <div className="forecast-container">
            <h2 className="forecast-header">Current Conditions</h2>
            <div className="forecast-row">
                {currentConditions && (
                    <div className="forecast-box">
                        <p className="forecast-emoji">{getWeatherEmoji(currentConditions.shortForecast)}</p>
                        <p className="forecast-temperature">{currentConditions.temperature}°{currentConditions.temperatureUnit}</p>
                        <p>{currentConditions.shortForecast}</p>
                        <p>Precipitation: {currentConditions.detailedForecast.match(/(\d+\.\d+ inches)|(\d+ inches)|(\d+\.\d+ cm)|(\d+ cm)/g) || 'None'}</p>
                    </div>
                )}
            </div>

            <h2 className="forecast-header">Forecast</h2>
            <div className="forecast-row">
                {[...next24Hours, ...next3Days].map((period, index) => (
                    <div key={index} className="forecast-box">
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


export default WeatherDashboard;
