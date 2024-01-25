import React from 'react';
import './Temperature.css'; // Make sure to create this CSS file

const Temperature = ({ data }) => {
    const getTemperatureClass = (temp) => {
        if (temp <= 32) return 'cold-temp';
        if (temp > 75) return 'hot-temp';
        return 'normal-temp';
    };

    return (
        <div className="flex flex-wrap justify-center gap-4">
            {data.map((item, index) => (
                <div key={index} className={`border border-gray-400 rounded shadow p-4 text-center w-48 h-32 flex items-center justify-center ${getTemperatureClass(item.lastData.tempf)}`}>
                    <div>
                        <p className="font-bold">Temperature</p>
                        <p>{item.lastData.tempf}°F</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Temperature;
