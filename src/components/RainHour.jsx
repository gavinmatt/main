import React from 'react';

const RainHour = ({ data }) => {
    // Check if data is available and only render the first item
    const firstItem = data && data[0];

    return (
        <div className="flex flex-wrap justify-center gap-4">
            {firstItem && (
                <div key={0} className="border border-gray-400 rounded shadow p-4 text-center w-48 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Rain Last Hour</p>
                        <p>{firstItem.lastData.hourlyrainin} in</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RainHour;
