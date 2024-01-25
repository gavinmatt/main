import React, { useEffect, useState } from 'react';
import Temperature from './Temperature.jsx';
import WindSpeed from './WindSpeed.jsx';
import WindDirection from './WindDirection.jsx';
import RainHour from './RainHour.jsx';
import RainDay from './RainDay.jsx';
import RainYear from './RainYear.jsx';



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

    if (loading) return <p className="text-center">Loading weather data...</p>;
    if (error) return <p className="text-center">Error loading data: {error.message}</p>;

    return (
        <div>
            {dataDate && <p className="text-center pb-5"><b>Weather data timestamp:</b> {dataDate} (Mountain Time)</p>}
            <p className="text-center pb-1">Current Weather</p>

            <div className="flex justify-center items-center gap-4 pb-4">
                {weatherData && <Temperature data={weatherData} />}
                {weatherData && <WindSpeed data={weatherData} />}
                {weatherData && <WindDirection data={weatherData} />}

            </div>
            <p className="text-center pb-1">Precipitation</p>

            <div className="flex justify-center items-center gap-4">
                {weatherData && <RainHour data={weatherData} />}
                {weatherData && <RainDay data={weatherData} />}
                {weatherData && <RainYear data={weatherData} />}

            </div>
        </div>
    );
};

export default WeatherDashboard;
