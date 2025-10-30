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
import CurrentWeather from './CurrentWeather.jsx';

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
                console.log('Fetched data:', data); // Log the fetched data
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
        <div>
        
            {dataDate && <p className="text-center pb-5"><b>Weather data pulled at:</b> {dataDate} (Mountain Time)</p>}

            <h3 className="text-center" style={{ fontSize: '3rem' }}>Current Conditions</h3>
            <CurrentWeather />
            <p className="text-center pb-1"><b>Raw Data 📊</b></p>

            <div className="lg:flex flex-wrap justify-center items-center gap-4 pb-4 pt-1">
                {weatherData && <Temperature data={weatherData} />}
                {weatherData && <WindSpeed data={weatherData} />}
                {weatherData && <WindDirection data={weatherData} />}
            </div>

            <div className="lg:flex flex-wrap justify-center items-center gap-4 pb-5">
                {weatherData && <FeelsLike data={weatherData} />}
                {weatherData && <Humidity data={weatherData} />}
                {weatherData && <Pressure data={weatherData} />}
            </div>

            <p className="text-center pb-1"><b>Precipitation Totals 🌧</b></p>

            <div className="lg:flex flex-wrap justify-center items-center gap-4 pb-5">
                {weatherData && <RainHour data={weatherData} />}
                {weatherData && <RainDay data={weatherData} />}
                {weatherData && <RainYear data={weatherData} />}
            </div>

    <div>
        <WeatherForecast />
    </div>
        </div>
    );
};

export default WeatherDashboard;