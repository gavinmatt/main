import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

const WeatherChart = ({ apiEndpoint }) => {
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(apiEndpoint);
                const data = await response.json();

                const formattedData = data.map(item => {
                    const date = new Date(item.dateutc); // Convert UNIX timestamp to Date object
                    const formattedDate = date.toLocaleString(); // Format date to a readable string

                    return {
                        label: formattedDate,
                        value: item.tempf  // Assuming 'tempf' is the temperature field
                    };
                });

                setChartData(formattedData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [apiEndpoint]);

    useEffect(() => {
        if (chartData.length && chartRef.current) {
            const chartContext = chartRef.current.getContext('2d');
            new Chart(chartContext, {
                type: 'line',
                data: {
                    labels: chartData.map(item => item.label),
                    datasets: [{
                        label: 'Temperature (°F)',
                        data: chartData.map(item => item.value),
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: false
                        }
                    }
                }
            });
        }
    }, [chartData]);

    return <canvas ref={chartRef}></canvas>;
};

export default WeatherChart;