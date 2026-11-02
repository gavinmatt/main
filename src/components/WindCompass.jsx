import React from 'react';

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export const compassPoint = (degrees) => POINTS[Math.round(degrees / 22.5) % 16];

// The arrow points where the wind is blowing toward, the way it moves on a map.
const WindCompass = ({ degrees, calm }) => (
    <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0" role="img"
        aria-label={calm ? 'Calm' : `Wind from ${compassPoint(degrees)}`}>
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
        {[0, 90, 180, 270].map((d) => (
            <line key={d} x1="50" y1="8" x2="50" y2="14" stroke="currentColor" strokeOpacity="0.4"
                strokeWidth="2" transform={`rotate(${d} 50 50)`} />
        ))}
        <text x="50" y="25" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">N</text>
        {!calm && (
            <g transform={`rotate(${degrees + 180} 50 50)`}>
                <line x1="50" y1="72" x2="50" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <path d="M50 24 L59 38 L41 38 Z" fill="currentColor" />
            </g>
        )}
    </svg>
);

export default WindCompass;
