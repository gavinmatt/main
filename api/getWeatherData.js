export default async function(req, res) {
    const applicationKey = process.env.APPLICATION_KEY;
    const apiKey = process.env.API_KEY;
    const macAddress = process.env.MAC_ADDRESS;

    const apiUrl = `https://api.ambientweather.net/v1/devices/${macAddress}?apiKey=${apiKey}&applicationKey=${applicationKey}&endDate=${Date.now()}&limit=48`;

    try {
        const weatherResponse = await fetch(apiUrl);
        if (!weatherResponse.ok) {
            throw new Error(`API call failed with status: ${weatherResponse.status}`);
        }

        const weatherData = await weatherResponse.json();
        res.status(200).json(weatherData);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ message: "Error fetching weather data" });
    }
}


