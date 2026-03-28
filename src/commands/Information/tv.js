/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "tv",
  aliases: ["show", "series", "tvshow"],
  category: "Information",
  description: "Look up TV show information from TMDB",
  usage: "<show name>",
  args: true,
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const query = args.join(" ");
    const apiKey = client.config.api?.tmdb;

    if (!apiKey) return message.reply(C.v2(C.fail("TMDB API not configured.")));

    try {
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!searchRes.ok) return message.reply(C.v2(C.fail("Failed to search TMDB.")));
      const searchData = await searchRes.json();

      if (!searchData.results?.length)
        return message.reply(C.v2(C.fail(`No TV show found for **${query}**.`)));

      const show = searchData.results[0];
      const poster = show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null;
      const year = show.first_air_date?.slice(0, 4) || "N/A";
      const rating = show.vote_average ? show.vote_average.toFixed(1) : "N/A";
      const overview = show.overview
        ? (show.overview.length > 400 ? show.overview.slice(0, 400) + "…" : show.overview)
        : "No overview available.";

      const stars = Math.round((show.vote_average || 0) / 2);
      const starBar = "⭐".repeat(stars) + "☆".repeat(5 - stars);

      const body =
        `**${show.name}** (${year})\n\n` +
        `${starBar} **${rating}**/10\n\n` +
        `${overview}\n\n` +
        `${e.dot} **Popularity** · ${Math.round(show.popularity)}\n` +
        `${e.dot} **Votes** · ${show.vote_count || 0}\n` +
        `${e.dot} **Language** · ${(show.original_language || "en").toUpperCase()}`;

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### 📺  TV Show Info`))
        .addSeparatorComponents(C.separator());

      if (poster) {
        container.addSectionComponents(C.section(body, poster));
      } else {
        container.addTextDisplayComponents(C.text(body));
      }

      container
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(C.btn.link("View on TMDB", `https://www.themoviedb.org/tv/${show.id}`))
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} TMDB · Aevix Information`));

      await message.reply(C.v2(container));
    } catch {
      await message.reply(C.v2(C.fail("Failed to fetch TV show info. Try again.")));
    }
  },
};
