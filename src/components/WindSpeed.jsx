import React from 'react';

const WindSpeed = ({ data }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4">
            {data.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded shadow p-4 text-center w-32 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Wind Speed</p>
                        <p>{item.lastData.windspeedmph} mph</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WindSpeed;