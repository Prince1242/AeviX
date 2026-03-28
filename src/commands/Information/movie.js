/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "movie",
  aliases: ["film", "imdb"],
  category: "Information",
  description: "Look up movie information from TMDB",
  usage: "<movie name>",
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
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!searchRes.ok) return message.reply(C.v2(C.fail("Failed to search TMDB.")));
      const searchData = await searchRes.json();

      if (!searchData.results?.length)
        return message.reply(C.v2(C.fail(`No movie found for **${query}**.`)));

      const movie = searchData.results[0];
      const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
      const year = movie.release_date?.slice(0, 4) || "N/A";
      const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
      const overview = movie.overview
        ? (movie.overview.length > 400 ? movie.overview.slice(0, 400) + "…" : movie.overview)
        : "No overview available.";

      /* Star rating bar */
      const stars = Math.round((movie.vote_average || 0) / 2);
      const starBar = "⭐".repeat(stars) + "☆".repeat(5 - stars);

      const body =
        `**${movie.title}** (${year})\n\n` +
        `${starBar} **${rating}**/10\n\n` +
        `${overview}\n\n` +
        `${e.dot} **Popularity** · ${Math.round(movie.popularity)}\n` +
        `${e.dot} **Votes** · ${movie.vote_count || 0}\n` +
        `${e.dot} **Language** · ${(movie.original_language || "en").toUpperCase()}`;

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### 🎬  Movie Info`))
        .addSeparatorComponents(C.separator());

      if (poster) {
        container.addSectionComponents(C.section(body, poster));
      } else {
        container.addTextDisplayComponents(C.text(body));
      }

      container
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(C.btn.link("View on TMDB", `https://www.themoviedb.org/movie/${movie.id}`))
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} TMDB · Aevix Information`));

      await message.reply(C.v2(container));
    } catch {
      await message.reply(C.v2(C.fail("Failed to fetch movie info. Try again.")));
    }
  },
};
