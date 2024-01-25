// /api/weather.js
export default async function(req, res) {
    const applicationKey = process.env.APPLICATION_KEY;
    const apiKey = process.env.API_KEY;
    const apiUrl = `https://rt.ambientweather.net/v1/devices?applicationKey=${applicationKey}&apiKey=${apiKey}`;

    try {
        const weatherResponse = await fetch(apiUrl);
        const weatherData = await weatherResponse.json();
        res.status(200).json(weatherData);
    } catch (error) {
        res.status(500).json({ message: "Error fetching weather data" });
    }
}
