import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';

// Categorical slots from the shared data-viz palette, stepped for each theme.
const SERIES_COLORS = {
    light: ['#2a78d6', '#eb6834'],
    dark: ['#3987e5', '#d95926'],
};

const HOUR_MS = 3600000;

const isDarkTheme = () => document.documentElement.getAttribute('data-theme') === 'lofi-dark';

const formatHour = (ms) =>
    new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'America/Denver' });

const formatTime = (ms) =>
    new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver' });

// series: [{ label, slot, points: [{ x: ms, y }] }], all in the same unit. slot picks
// the palette color, so an entity keeps its color whatever order it's listed in.
const WeatherTrendChart = ({ series, unit, digits = 0 }) => {
    const canvasRef = useRef(null);
    const [dark, setDark] = useState(isDarkTheme);

    useEffect(() => {
        const onThemeChange = () => setDark(isDarkTheme());
        window.addEventListener('themechange', onThemeChange);
        return () => window.removeEventListener('themechange', onThemeChange);
    }, []);

    useEffect(() => {
        if (!canvasRef.current || !series.some((s) => s.points.length)) return;
        const colors = SERIES_COLORS[dark ? 'dark' : 'light'];
        const ink = dark ? '#c3c2b7' : '#52514e';
        const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

        const chart = new Chart(canvasRef.current, {
            type: 'line',
            data: {
                datasets: series.map((s, i) => ({
                    label: s.label,
                    data: s.points,
                    borderColor: colors[s.slot ?? i],
                    backgroundColor: colors[s.slot ?? i],
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.3,
                })),
            },
            options: {
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: series.length > 1,
                        align: 'start',
                        labels: { color: ink, boxWidth: 12, boxHeight: 2, font: { size: 11 } },
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => formatTime(items[0].parsed.x),
                            label: (item) => `${item.dataset.label}: ${item.parsed.y.toFixed(digits)}${unit}`,
                        },
                    },
                },
                scales: {
                    x: {
                        type: 'linear',
                        ticks: { color: ink, stepSize: 6 * HOUR_MS, callback: formatHour, maxRotation: 0, font: { size: 11 } },
                        grid: { display: false },
                        border: { color: grid },
                    },
                    y: {
                        ticks: { color: ink, maxTicksLimit: 4, font: { size: 11 }, callback: (v) => `${v.toFixed(digits)}${unit}` },
                        grid: { color: grid },
                        border: { display: false },
                    },
                },
            },
        });
        return () => chart.destroy();
    }, [series, dark, unit, digits]);

    return (
        <div className="h-36 mt-3">
            <canvas ref={canvasRef} aria-label={`Last 24 hours: ${series.map((s) => s.label).join(', ')}`} role="img" />
        </div>
    );
};

export default WeatherTrendChart;
