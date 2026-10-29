// Wet-bulb temperature from the station's air temp, humidity, and pressure.
// Solves the psychrometric equation by bisection, which stays accurate near
// freezing where the common Stull shortcut can be off by a degree or more.

// Station elevation, used for standard-atmosphere pressure when the station's
// own reading is missing.
const ELEVATION_FT = 3032;
const STANDARD_PRESSURE_HPA = 1013.25 * (1 - 2.25577e-5 * ELEVATION_FT * 0.3048) ** 5.25588;

const saturationVaporPressure = (tC) => 6.112 * Math.exp((17.67 * tC) / (tC + 243.5));

export function wetBulbF(tempF, humidity, pressureInHg) {
    if (tempF == null || humidity == null) return null;
    const tC = ((tempF - 32) * 5) / 9;
    // baromabsin is station pressure, so it already reflects the elevation.
    const pHpa = pressureInHg ? pressureInHg * 33.8639 : STANDARD_PRESSURE_HPA;
    const vapor = (saturationVaporPressure(tC) * humidity) / 100;

    let lo = -60;
    let hi = tC;
    for (let i = 0; i < 50; i++) {
        const tw = (lo + hi) / 2;
        const gamma = 0.00066 * (1 + 0.00115 * tw) * pHpa;
        const estimate = saturationVaporPressure(tw) - gamma * (tC - tw);
        if (estimate > vapor) hi = tw;
        else lo = tw;
    }
    return ((lo + hi) / 2) * 9 / 5 + 32;
}

// Surface wet bulb is the best single-sensor predictor of precip type: falling
// snow cools the air toward it. It can't see a warm layer aloft, so freezing
// rain and sleet aren't distinguishable from here.
export function precipType(wetBulb) {
    if (wetBulb == null) return null;
    if (wetBulb <= 25) return { text: "Dry snow", emoji: "❄️" };
    if (wetBulb <= 32) return { text: "Snow", emoji: "🌨" };
    if (wetBulb <= 34) return { text: "Wet snow", emoji: "🌨" };
    if (wetBulb <= 37) return { text: "Rain/snow mix", emoji: "🌧" };
    return { text: "Rain", emoji: "🌧" };
}
