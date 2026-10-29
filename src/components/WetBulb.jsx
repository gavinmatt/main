import React from 'react';
import { wetBulbF } from '../lib/wetBulb.js';

const WetBulb = ({ data }) => {
    // Check if data is available and only render the first item
    const firstItem = data && data[0];
    const wetBulb = firstItem && wetBulbF(firstItem.lastData.tempf, firstItem.lastData.humidity, firstItem.lastData.baromabsin);

    return (
        <div className="flex flex-wrap justify-center gap-4">
            {wetBulb != null && (
                <div key={0} className="border border-gray-400 rounded shadow p-4 text-center w-48 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Wet Bulb</p>
                        <p>{wetBulb.toFixed(1)}°F</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WetBulb;
