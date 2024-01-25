import React from 'react';

const Humidity = ({ data }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4">
            {data.map((item, index) => (
                <div key={index} className="border border-gray-400 rounded shadow p-4 text-center w-48 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Humidity</p>
                        <p>{item.lastData.humidity}%</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Humidity;
