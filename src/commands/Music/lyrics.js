/** @format */

const { fetchLyrics } = require("../../utils/lyrics");
const { paginate } = require("../../utils/paginator");
const { chunk } = require("../../utils/convert");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "lyrics",
  aliases: ["ly"],
  category: "Music",
  description: "Show lyrics for the current or specified track",
  usage: "[song name]",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);

    let title, artist, duration;
    if (args.length) {
      title = args.join(" ");
      artist = "";
    } else if (player?.queue.current) {
      title = player.queue.current.title;
      artist = player.queue.current.author;
      duration = player.queue.current.length;
    } else {
      return message.reply(C.v2(C.fail("Nothing playing and no song name provided.\nUsage: `" + prefix + "lyrics [song name]`")));
    }

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`${e.loading} Searching lyrics for **${title}**...`))
    ));

    const data = await fetchLyrics(title, artist, duration);
    if (!data || (!data.plainLyrics && !data.syncedLyrics)) {
      return loadMsg.edit(C.v2(C.fail(`No lyrics found for **${title}**.`)));
    }

    const lyricsText = data.plainLyrics || data.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]\s*/g, "");

    /* Split into pages */
    const lines = lyricsText.split("\n");
    const pages = chunk(lines, 25).map((c) => c.join("\n"));

    await loadMsg.delete().catch(() => null);

    await paginate(message, client, {
      pages,
      title: `${MARK}  Lyrics — ${data.trackName || title}`,
      color: COLORS.brand,
      footer: `-# ${MARK} ${data.artistName || artist || "Unknown Artist"} · Source: LRCLIB`,
      userId: message.author.id,
      timeout: 180_000,
    });
  },
};
