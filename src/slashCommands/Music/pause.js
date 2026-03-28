/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "pause",
  description: "Pause the current track",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  run: async (client, interaction) => {
    const C = client.components;
    const player = client.manager.players.get(interaction.guildId);

    if (player.paused)
      return interaction.reply(C.v2(C.fail("Playback is already **paused**.")));
    if (!player.queue.current)
      return interaction.reply(C.v2(C.fail("Nothing is currently playing.")));

    player.pause(true);

    await interaction.reply(C.v2(
      C.ok(`Paused **${player.queue.current.title}**`)
    ));
  },
};