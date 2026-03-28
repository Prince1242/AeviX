/** @format */

const Components = require("../../custom/components");

const { MARK, COLORS } = Components;

module.exports = {
  name: "autoplay",
  description: "Toggle autoplay mode — plays similar tracks when the queue ends",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(interaction.guildId);

    const current = player.data?.get("autoplay") || false;
    const next = !current;

    player.data.set("autoplay", next);

    if (!next) {
      /* Clear autoplay history when turning off */
      player.data.set("autoplayHistory", []);
    }

    const container = C.container(next ? COLORS.success : COLORS.warn)
      .addTextDisplayComponents(
        C.text(
          `${MARK} Autoplay **${next ? "enabled" : "disabled"}**\n` +
          `-# ${next
            ? "Similar tracks will play when the queue runs out."
            : "Playback will stop when the queue is empty."
          }`
        )
      );

    await interaction.reply(C.v2(container));
  },
};