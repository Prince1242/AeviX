/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "weather",
  aliases: ["w", "temp"],
  category: "Information",
  description: "Get current weather for any city",
  usage: "<city name>",
  args: true,
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const city = args.join(" ");
    const apiKey = client.config.api?.openweather;

    if (!apiKey) return message.reply(C.v2(C.fail("Weather API not configured.")));

    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!res.ok) {
        if (res.status === 404) return message.reply(C.v2(C.fail(`City **${city}** not found.`)));
        return message.reply(C.v2(C.fail("Failed to fetch weather data.")));
      }

      const data = await res.json();
      const temp = Math.round(data.main.temp);
      const feelsLike = Math.round(data.main.feels_like);
      const humidity = data.main.humidity;
      const wind = data.wind.speed;
      const desc = data.weather[0]?.description || "Unknown";
      const icon = data.weather[0]?.icon;
      const country = data.sys?.country || "";
      const tempF = Math.round((temp * 9/5) + 32);

      /* Weather emoji map */
      const weatherEmoji = {
        "01": "☀️", "02": "⛅", "03": "☁️", "04": "☁️",
        "09": "🌧️", "10": "🌦️", "11": "⛈️", "13": "❄️", "50": "🌫️",
      };
      const emoji = weatherEmoji[icon?.slice(0, 2)] || "🌤️";

      /* Temperature bar */
      const tempNorm = Math.min(Math.max((temp + 20) / 60, 0), 1);
      const tempBlocks = Math.round(tempNorm * 12);
      const tempBar = "█".repeat(tempBlocks) + "░".repeat(12 - tempBlocks);
      const tempColor = temp < 0 ? COLORS.info : temp < 15 ? COLORS.brand : temp < 30 ? COLORS.success : COLORS.error;

      const container = C.container(tempColor)
        .addTextDisplayComponents(C.text(`### ${emoji}  Weather — ${data.name}, ${country}`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**${desc.charAt(0).toUpperCase() + desc.slice(1)}**\n\n` +
          `🌡️ \`${tempBar}\` **${temp}°C** / ${tempF}°F\n\n` +
          `${e.dot} **Feels Like** · ${feelsLike}°C\n` +
          `${e.dot} **Humidity** · ${humidity}%\n` +
          `${e.dot} **Wind** · ${wind} m/s\n` +
          `${e.dot} **Pressure** · ${data.main.pressure} hPa\n` +
          `${e.dot} **Visibility** · ${((data.visibility || 0) / 1000).toFixed(1)} km`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} OpenWeather · Aevix Information`));

      await message.reply(C.v2(container));
    } catch {
      await message.reply(C.v2(C.fail("Failed to fetch weather. Try again.")));
    }
  },
};
