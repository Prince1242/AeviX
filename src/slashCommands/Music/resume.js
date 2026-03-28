/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "resume",
  description: "Resume playback",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  run: async (client, interaction) => {
    const C = client.components;
    const player = client.manager.players.get(interaction.guildId);

    if (!player.paused)
      return interaction.reply(C.v2(C.fail("Playback is **not paused**.")));

    player.pause(false);

    await interaction.reply(C.v2(
      C.ok(`Resumed **${player.queue.current?.title || "playback"}**`)
    ));
  },
};