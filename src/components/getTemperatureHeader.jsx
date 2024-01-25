const getTemperatureHeader = (temp) => {
    if (temp <= 32) {
      return { text: "Freezing", emoji: "🥶" };
    } else if (temp > 32 && temp <= 60) {
      return { text: "Cold", emoji: "❄️" };
    } else if (temp > 60 && temp <= 75) {
      return { text: "Perfect", emoji: "😎" };
    } else if (temp > 75 && temp <= 90) {
      return { text: "Warm", emoji: "🌶" };
    } else {
      return { text: "Hot", emoji: "🔥" };
    }
  };
  