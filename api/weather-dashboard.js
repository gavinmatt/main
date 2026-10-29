// Current conditions plus the last 24 hours, in one cached response.
// Ambient allows one request per second per key, so the two calls run in
// sequence, and the CDN cache keeps page refreshes from reaching Ambient at all.

const HISTORY_FIELDS = ["dateutc", "tempf", "dewPoint", "baromabsin", "windspeedmph", "windgustmph"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function (req, res) {
    const applicationKey = process.env.APPLICATION_KEY;
    const apiKey = process.env.API_KEY;
    const macAddress = process.env.MAC_ADDRESS;
    const auth = `applicationKey=${applicationKey}&apiKey=${apiKey}`;

    try {
        const devicesResponse = await fetch(`https://rt.ambientweather.net/v1/devices/?${auth}`);
        if (!devicesResponse.ok) {
            throw new Error(`API call failed with status: ${devicesResponse.status}`);
        }
        const devices = await devicesResponse.json();
        const current = devices[0]?.lastData;
        if (!current) throw new Error("No station data");

        // History is nice to have; the page still works without it.
        let history = [];
        try {
            await sleep(1100);
            const historyResponse = await fetch(
                `https://api.ambientweather.net/v1/devices/${macAddress}?${auth}&endDate=${Date.now()}&limit=288`
            );
            if (historyResponse.ok) {
                const rows = await historyResponse.json();
                history = rows.map((row) => Object.fromEntries(HISTORY_FIELDS.map((k) => [k, row[k]])));
            }
        } catch (error) {
            console.error("Error fetching weather history:", error);
        }

        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=240");
        res.status(200).json({ current, history });
    } catch (error) {
        console.error("Error fetching weather data:", error);
        res.status(500).json({ message: "Error fetching weather data" });
    }
}
