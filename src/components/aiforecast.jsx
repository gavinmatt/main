export function aiForecast(station, nws) {
    const now = nws?.properties?.periods?.[0];
    if (!station || !now) return "Weather data unavailable.";
  
    const temp = station.tempf || 0;
    const forecastTemp = now.temperature || 0;
    const tempDiff = temp - forecastTemp;
  
    const windSpeed = station.windspeedmph || 0;
    const windDir = station.winddir || 0;
    const pressure = station.baromrelin || 0;
  
    const humidity = station.humidity || 0;
    const dewpoint = station.dewPoint || null;
    const rainRate = station.hourlyrainin || 0;
    const dailyRain = station.dailyrainin || 0;
  
    const forecastText = (now.detailedForecast || "").toLowerCase();
    const summary = [];
  
    // --- Temperature
    if (tempDiff > 8) {
      summary.push("Significantly warmer locally than forecast — clearer skies or downslope warming likely.");
    } else if (tempDiff > 3) {
      summary.push("A few degrees warmer than expected, probably due to local sun breaks.");
    } else if (tempDiff < -8) {
      summary.push("Much colder here than forecast — cloud cover or elevation cooling may be at play.");
    } else if (tempDiff < -3) {
      summary.push("Slightly cooler than expected — localized chill or lingering morning clouds.");
    } else {
      summary.push("Temperatures track closely with the forecast.");
    }
  
    // --- Wind
    if (windSpeed > 25) {
      summary.push("Strong winds — expect gusts through the afternoon, especially near open areas.");
    } else if (windSpeed > 15) {
      summary.push("Breezy conditions — noticeable gusts at times.");
    } else if (windSpeed > 5) {
      summary.push("Light breeze, generally comfortable outdoors.");
    } else {
      summary.push("Calm air locally — a stable pocket of weather.");
    }
  
    if (windDir >= 315 || windDir <= 45) {
      summary.push("Northerly flow — often cooler and drier air in this region.");
    } else if (windDir > 45 && windDir <= 135) {
      summary.push("Easterly winds — can bring upslope moisture or low clouds.");
    } else if (windDir > 135 && windDir <= 225) {
      summary.push("Southerly winds — usually warmer and more humid.");
    } else if (windDir > 225 && windDir < 315) {
      summary.push("Westerly flow — drier, often clearer mountain air.");
    }
  
    // --- Pressure
    if (pressure > 30.3) {
      summary.push("High pressure dominates — stable and dry pattern.");
    } else if (pressure > 30.0) {
      summary.push("Pressure steady and high — fair weather persists.");
    } else if (pressure >= 29.7 && pressure <= 30.0) {
      summary.push("Pressure holding near normal — no major changes soon.");
    } else if (pressure < 29.7) {
      summary.push("Falling pressure hints at an approaching front — unsettled weather may develop.");
    }
  
    // --- Precipitation
    const precipForecasted =
      forecastText.includes("rain") ||
      forecastText.includes("snow") ||
      forecastText.includes("showers") ||
      forecastText.includes("precip") ||
      forecastText.includes("storm");
  
    const veryHumid = humidity > 90 || (dewpoint && temp - dewpoint < 2);
    const lightRain = rainRate > 0 && rainRate <= 0.05;
    const moderateRain = rainRate > 0.05 && rainRate <= 0.25;
    const heavyRain = rainRate > 0.25;
  
    if (heavyRain) {
      summary.push("Heavy rainfall detected — strong showers or storms active nearby.");
    } else if (moderateRain) {
      summary.push("Moderate rain currently falling — steady showers in progress.");
    } else if (lightRain) {
      summary.push("Light rain or drizzle at the station — brief passing showers likely.");
    } else if (precipForecasted && veryHumid && pressure < 29.9) {
      summary.push("No rain yet, but humidity and pressure suggest showers could form soon.");
    } else if (precipForecasted && pressure > 30.1) {
      summary.push("Forecast calls for rain, but high pressure may suppress development.");
    } else if (dailyRain > 0 && !precipForecasted) {
      summary.push("Recent rainfall despite a dry forecast — local microshowers possible.");
    } else if (!precipForecasted && pressure > 30.0 && !veryHumid) {
      summary.push("No precipitation expected — dry and stable air dominates.");
    }
  
    // --- Synthesis
    if (forecastText.includes("snow")) {
      summary.push("Snow potential noted in the forecast — monitor temps near freezing overnight.");
    }
    if (forecastText.includes("thunder")) {
      summary.push("Thunderstorms possible — brief heavy rain or gusty outflows later today.");
    }
  
    // --- Optional overall summary
    const overall = (() => {
      if (heavyRain) return "Rainy and unsettled conditions.";
      if (moderateRain) return "Showery pattern continuing.";
      if (precipForecasted && pressure < 29.8) return "Likely showers or storms developing.";
      if (pressure > 30.1 && !precipForecasted) return "Stable, dry, and calm weather today.";
      if (tempDiff > 5 && windSpeed < 10) return "Pleasantly warm and still day.";
      return "Typical conditions — minor local variations from forecast.";
    })();
  
    summary.push(`Overall: ${overall}`);
  
    return summary.join(" ");
  }
  