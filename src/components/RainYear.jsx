import React from 'react';

const RainYear = ({ data }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4">
            {data.map((item, index) => (
                <div key={index} className="border border-gray-400 rounded shadow p-4 text-center w-32 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Rain This Year</p>
                        <p>{item.lastData.yearlyrainin} in</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RainYear;
