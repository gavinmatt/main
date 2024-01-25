import React, { useEffect, useState } from 'react';
import Temperature from './Temperature.jsx';
import WindSpeed from './WindSpeed.jsx';
import WindDirection from './WindDirection.jsx';
import RainHour from './RainHour.jsx';
import RainDay from './RainDay.jsx';
import RainYear from './RainYear.jsx';

const WeatherDashboard = ({ apiEndpoint }) => {
    // ... (existing code)

    return (
        <div>
            {dataDate && <p className="text-center pb-4"><b>Weather data timestamp:</b> {dataDate} (Mountain Time)</p>}
            <div className="flex justify-center items-center gap-4 pb-4">
                {weatherData && <Temperature data={weatherData} />}
                {weatherData && <div className="w-48">{/* Add a CSS class to control width */}
                    <WindSpeed data={weatherData} />
                </div>}
                {weatherData && <div className="w-48">{/* Add a CSS class to control width */}
                    <WindDirection data={weatherData} />
                </div>}
            </div>
            <div className="flex justify-center items-center gap-4">
                {weatherData && <div className="w-48">{/* Add a CSS class to control width */}
                    <RainHour data={weatherData} />
                </div>}
                {weatherData && <div className="w-48">{/* Add a CSS class to control width */}
                    <RainDay data={weatherData} />
                </div>}
                {weatherData && <div className="w-48">{/* Add a CSS class to control width */}
                    <RainYear data={weatherData} />
                </div>}
            </div>
        </div>
    );
};

export default WeatherDashboard;
