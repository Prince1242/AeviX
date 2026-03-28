/** @format */

const Components = require("../../custom/components");

const { MARK } = Components;

module.exports = {
  name: "skip",
  description: "Skip to the next track",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  run: async (client, interaction) => {
    const C = client.components;
    const player = client.manager.players.get(interaction.guildId);

    if (!player.queue.current)
      return interaction.reply(C.v2(C.fail("Nothing is currently playing.")));

    const skipped = player.queue.current.title;
    player.skip();

    await interaction.reply(C.v2(
      C.ok(`Skipped **${skipped}**`)
    ));
  },
};