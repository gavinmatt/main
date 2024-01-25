import React from 'react';

const RainHour = ({ data }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4">
            {data.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded shadow p-4 text-center w-32 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Rain Last Hour</p>
                        <p>{degreesToCardinal(item.lastData.hourlyrainin)} in</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RainHour;
