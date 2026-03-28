/** @format */

const { ApplicationCommandOptionType } = require("discord.js");
const { fetchLyrics, parseSynced, findCurrentLine, formatTimestamp } = require("../../utils/lyrics");
const { paginate } = require("../../utils/paginator");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "lyrics",
  description: "View lyrics for the current or a specified track",
  options: [
    {
      name: "query",
      description: "Search for specific lyrics (defaults to current track)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const query = interaction.options.getString("query");
    const player = client.manager.players.get(interaction.guildId);

    let title, artist, durationMs;

    if (query) {
      /* Manual query */
      const parts = query.split(/[-–—]/).map((s) => s.trim());
      if (parts.length >= 2) {
        artist = parts[0];
        title = parts.slice(1).join(" ");
      } else {
        title = query;
        artist = "";
      }
    } else {
      /* From current track */
      const track = player?.queue?.current;
      if (!track)
        return interaction.reply(C.v2(
          C.fail("Nothing is playing. Provide a query or play a track first.")
        ));
      title = track.title;
      artist = track.author;
      durationMs = track.length;
    }

    await interaction.deferReply();

    const data = await fetchLyrics(title, artist, durationMs);

    if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
      return interaction.editReply(C.v2(
        C.fail(`No lyrics found for **${title}**${artist ? ` by **${artist}**` : ""}.`)
      ));
    }

    const displayTitle = data.trackName || title;
    const displayArtist = data.artistName || artist || "Unknown";

    /* ── Synced lyrics ───────────────────────────── */
    if (data.syncedLyrics) {
      const lines = parseSynced(data.syncedLyrics);

      if (lines.length) {
        /* Highlight current line if playing */
        const position = player?.shoukaku?.position || 0;
        const currentIdx = player?.queue?.current ? findCurrentLine(lines, position) : -1;

        const formatted = lines.map((line, i) => {
          const ts = formatTimestamp(line.time);
          const marker = i === currentIdx ? "▶" : " ";
          const bold = i === currentIdx ? "**" : "";
          return `\`${ts}\` ${marker} ${bold}${line.text}${bold}`;
        });

        return paginate(interaction, client, {
          items: formatted,
          perPage: 20,
          title: `${MARK}  ${displayTitle} — ${displayArtist}`,
          color: COLORS.brand,
          footer: `-# ${MARK} Lyrics via LRCLIB · Synced`,
          userId: interaction.user.id,
        });
      }
    }

    /* ── Plain lyrics ────────────────────────────── */
    const plain = data.plainLyrics;
    const chunks = [];
    const lyricsLines = plain.split("\n");
    let current = "";

    for (const line of lyricsLines) {
      if ((current + "\n" + line).length > 900) {
        chunks.push(current.trim());
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    if (chunks.length === 0) {
      return interaction.editReply(C.v2(C.fail("Lyrics data was empty.")));
    }

    await paginate(interaction, client, {
      pages: chunks,
      title: `${MARK}  ${displayTitle} — ${displayArtist}`,
      color: COLORS.brand,
      footer: `-# ${MARK} Lyrics via LRCLIB`,
      userId: interaction.user.id,
    });
  },
};