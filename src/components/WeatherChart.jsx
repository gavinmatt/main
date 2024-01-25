const fetchData = async () => {
    try {
        const response = await fetch('/api/getWeatherData');
        const data = await response.json();

        let allData = [];
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                allData = allData.concat(data[key]);
            }
        });

        // Now allData is a single array containing all items
        const formattedData = allData.map(item => {
            const localDate = new Date(item.dateutc).toLocaleString();
            return {
                label: localDate,
                value: tempf
            };
        });

        setChartData(formattedData);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};
