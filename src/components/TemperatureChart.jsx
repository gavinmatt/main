import React, { useEffect, useState } from 'react';
import Chart from 'chart.js/auto';

const WeatherChart = () => {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch('/api/getWeatherData');
            const data = await response.json();

            // Process data to extract temperature for the last 48 hours
            const processedData = data.map(item => ({
                time: new Date(item.lastData.date).toLocaleTimeString(),
                temperature: item.lastData.tempf
            }));

            setChartData(processedData);
        };

        fetchData();
    }, []);

// Inside WeatherChart component
useEffect(() => {
    if (chartData.length) {
        const ctx = document.getElementById('weatherChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(item => item.time),
                datasets: [{
                    label: 'Temperature',
                    data: chartData.map(item => item.temperature),
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            }
        });
    }
}, [chartData]);

return (
    <canvas id="weatherChart"></canvas>
);
};

export default WeatherChart;
