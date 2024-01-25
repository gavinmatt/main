import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

const WeatherChart = ({ apiEndpoint2 }) => {
    const [chartData, setChartData] = useState([]);
    const [error, setError] = useState(null);
    const chartRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(apiEndpoint2);
                if (!response.ok) {
                    throw new Error(`Error fetching data: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // Assuming data is an array of arrays
                const formattedData = data.map((array, index) => {
                    const date = new Date(array.dateutc); // Convert UNIX timestamp to Date object
                    const formattedDate = date.toLocaleString(); // Format date to a readable string

                    return {
                        label: formattedDate,
                        value: array.tempf  // Assuming 'tempf' is the temperature field in each array
                    };
                });
                console.log('Formatted chart data:', formattedData); // Log formatted data
                setChartData(formattedData);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError(error.message);
            }
        };

        fetchData();
    }, [apiEndpoint2]);

    useEffect(() => {
        if (chartData.length && chartRef.current) {
            try {
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
            } catch (chartError) {
                console.error('Error rendering chart:', chartError);
                setError(chartError.message);
            }
        }
    }, [chartData]);

    return (
        <div>
            {error && <p className="text-center text-red-500">{error}</p>}
            <canvas ref={chartRef} id="weatherChart"></canvas>
        </div>
    );
};

export default WeatherChart;
