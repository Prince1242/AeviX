/** @format */

const { ApplicationCommandOptionType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, COLORS } = Components;

module.exports = {
  name: "volume",
  description: "Adjust the playback volume",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "level",
      description: "Volume level (0-150)",
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 0,
      max_value: 150,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(interaction.guildId);
    const level = interaction.options.getInteger("level");

    const old = player.volume ?? 80;
    player.setVolume(level);

    const icon = level === 0 ? "🔇" : level < 50 ? "🔉" : "🔊";
    const bar = "█".repeat(Math.round(level / 10)) + "░".repeat(Math.max(0, 15 - Math.round(level / 10)));

    await interaction.reply(C.v2(
      C.ok(`${icon} Volume: **${old}%** → **${level}%**\n\`${bar}\``)
    ));
  },
};