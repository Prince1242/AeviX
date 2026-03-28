/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "shuffle",
  description: "Shuffle the current queue",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  run: async (client, interaction) => {
    const C = client.components;
    const player = client.manager.players.get(interaction.guildId);

    if (player.queue.size < 2)
      return interaction.reply(C.v2(C.fail("Need at least **2 tracks** in the queue to shuffle.")));

    player.queue.shuffle();

    await interaction.reply(C.v2(
      C.ok(`Shuffled **${player.queue.size}** tracks in the queue.`)
    ));
  },
};