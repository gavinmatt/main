// Sunrise and sunset from the standard NOAA solar position approximation
// (accurate to a minute or two). Assumes a flat horizon; nearby mountains
// will hide the sun a little later and earlier than this.

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;
const HORIZON = RAD * -0.833; // refraction plus the sun's radius

const toDays = (date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const fromJulian = (j) => new Date((j + 0.5 - J1970) * DAY_MS);

export function sunTimes(date, lat, lon) {
    const lw = -lon * RAD;
    const phi = lat * RAD;
    const cycle = Math.round(toDays(date) - 0.0009 - lw / (2 * Math.PI));
    const approxNoon = 0.0009 + lw / (2 * Math.PI) + cycle;

    const anomaly = RAD * (357.5291 + 0.98560028 * approxNoon);
    const center = RAD * (1.9148 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly) + 0.0003 * Math.sin(3 * anomaly));
    const longitude = anomaly + center + RAD * 102.9372 + Math.PI;
    const declination = Math.asin(Math.sin(longitude) * Math.sin(OBLIQUITY));
    const transit = (ds) => J2000 + ds + 0.0053 * Math.sin(anomaly) - 0.0069 * Math.sin(2 * longitude);

    const noon = transit(approxNoon);
    const hourAngle = Math.acos(
        (Math.sin(HORIZON) - Math.sin(phi) * Math.sin(declination)) / (Math.cos(phi) * Math.cos(declination))
    );
    const set = transit(0.0009 + (hourAngle + lw) / (2 * Math.PI) + cycle);
    const rise = noon - (set - noon);

    return { sunrise: fromJulian(rise), sunset: fromJulian(set), solarNoon: fromJulian(noon) };
}
