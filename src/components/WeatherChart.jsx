import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

const WeatherChart = () => {
    const [chartData, setChartData] = useState([]);
    const chartRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/getWeatherData');
                const data = await response.json();
        
                let allData = [];
                Object.keys(data).forEach(key => {
                    if (Array.isArray(data[key])) {
                        allData = allData.concat(data[key]);
                    }
                });
        
                // Now allData is a single array containing all items
                const formattedData = allData.map(item => {
                    const localDate = new Date(dateutc).toLocaleString();
                    return {
                        label: localDate,
                        value: tempf
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

    return <canvas ref={chartRef} id="weatherChart"></canvas>;
};

export default WeatherChart;


