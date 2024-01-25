import React from 'react';

const RainDay = ({ data }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4">
            {data.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded shadow p-4 text-center w-32 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Rain Today</p>
                        <p>{degreesToCardinal(item.lastData.dailyrainin)} in</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RainDay;
