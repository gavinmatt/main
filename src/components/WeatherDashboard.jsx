import React, { useEffect, useState } from 'react';
import Temperature from './Temperature.jsx';
import WindSpeed from './WindSpeed.jsx';

const WeatherDashboard = ({ apiEndpoint }) => {
    const [weatherData, setWeatherData] = useState(null);
    const [dataDate, setDataDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(apiEndpoint);
                const data = await weatherData.json();
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
            {dataDate && <p className="text-center pb-4"><b>Weather data timestamp:</b> {dataDate} (Mountain Time)</p>}
            <div className="flex justify-center items-center gap-4">
                {weatherData && <Temperature data={weatherData} />}
                {weatherData && <WindSpeed data={weatherData} />}
            </div>
        </div>
    );
};

export default WeatherDashboard;
