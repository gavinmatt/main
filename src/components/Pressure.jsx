import React from 'react';

const Pressure = ({ data }) => {
    return (
        <div className="flex flex-wrap justify-center gap-4">
            {data.map((item, index) => (
                <div key={index} className="border border-gray-400 rounded shadow p-4 text-center w-48 h-32 flex items-center justify-center">
                    <div>
                        <p className="font-bold">Pressure</p>
                        <p>{item.lastData.baromabsin} inHg</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default Pressure;
