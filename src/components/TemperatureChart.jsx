import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

const WeatherChart = () => {
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Update the endpoint to match your serverless function's route
                const response = await fetch('/api/getWeatherData');
                const data = await response.json();
                
                // Process and format the data for Chart.js
                const formattedData = data.map(item => {
                    return {
                        // Adjust these fields based on the structure of your API response
                        label: new Date(item.lastData.date).toLocaleTimeString(),
                        value: item.lastData.tempf
                    };
                });

                setChartData(formattedData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (chartData.length && chartRef.current) {
            const chartContext = chartRef.current.getContext('2d');
            new Chart(chartContext, {
                type: 'line',
                data: {
                    labels: chartData.map(item => item.label),
                    datasets: [{
                        label: 'Temperature',
                        data: chartData.map(item => item.value),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }, [chartData]);

    return <canvas ref={chartRef} id="weatherChart"></canvas>;
};

export default WeatherChart;
