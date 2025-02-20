import React from 'react';

// Helper function to convert wind direction from degrees to cardinal directions
function degreesToCardinal(degrees) {
    const cardinalDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round((degrees % 360) / 22.5);
    return cardinalDirections[index];
}

const WindDirection = ({ data }) => {
    // Check if data is available and only render the first item
    const firstItem = data && data[0];

    return (
        <div className="flex flex-wrap justify-center gap-4">
            {firstItem && (
                <div key={0} className="border border-gray-400 rounded shadow p-4 text-center w-48 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Wind Direction</p>
                        <p>{degreesToCardinal(firstItem.lastData.winddir)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WindDirection;
