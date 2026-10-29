import React from 'react';
import { wetBulbF, precipType } from '../lib/wetBulb.js';

const PrecipType = ({ data }) => {
    // Check if data is available and only render the first item
    const firstItem = data && data[0];
    const type = firstItem && precipType(wetBulbF(firstItem.lastData.tempf, firstItem.lastData.humidity, firstItem.lastData.baromabsin));

    return (
        <div className="flex flex-wrap justify-center gap-4">
            {type && (
                <div key={0} className="border border-gray-400 rounded shadow p-4 text-center w-48 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Precip Would Fall As</p>
                        <p>{type.text} {type.emoji}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrecipType;
