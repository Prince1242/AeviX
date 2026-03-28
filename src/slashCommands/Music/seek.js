/** @format */

const { ApplicationCommandOptionType } = require("discord.js");
const { convertTime, convertHmsToMs } = require("../../utils/convert");
const Components = require("../../custom/components");

module.exports = {
  name: "seek",
  description: "Seek to a position in the current track",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "position",
      description: "Time to seek to (e.g. 1:30, 90, 2:15:00)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(interaction.guildId);
    const track = player.queue.current;

    if (!track)
      return interaction.reply(C.v2(C.fail("Nothing is currently playing.")));
    if (!track.isSeekable)
      return interaction.reply(C.v2(C.fail("This track is **not seekable**.")));

    const input = interaction.options.getString("position").trim();

    /* ── Parse position ──────────────────────────── */
    let ms;

    if (input.includes(":")) {
      /* hh:mm:ss or mm:ss format */
      ms = convertHmsToMs(input);
    } else {
      /* Try as raw seconds */
      const num = parseInt(input);
      if (isNaN(num)) return interaction.reply(C.v2(C.fail("Invalid time format. Use `1:30` or `90` (seconds).")));
      ms = num * 1000;
    }

    if (ms < 0)
      return interaction.reply(C.v2(C.fail("Cannot seek to a negative position.")));
    if (ms >= track.length)
      return interaction.reply(C.v2(C.fail(`Position exceeds track length (\`${convertTime(track.length)}\`).`)));

    try {
      player.seek(ms);
    } catch (err) {
      return interaction.reply(C.v2(C.fail(`Failed to seek: ${err.message}`)));
    }

    await interaction.reply(C.v2(
      C.ok(`Seeked to \`${convertTime(ms)}\` / \`${convertTime(track.length)}\``)
    ));
  },
};