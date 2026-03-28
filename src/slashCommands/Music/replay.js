/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "replay",
  description: "Replay the current track from the beginning",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  run: async (client, interaction) => {
    const C = client.components;
    const player = client.manager.players.get(interaction.guildId);
    const track = player.queue.current;

    if (!track)
      return interaction.reply(C.v2(C.fail("Nothing is currently playing.")));

    if (!track.isSeekable) {
      return interaction.reply(C.v2(
        C.fail("This track is **not seekable** and cannot be replayed.")
      ));
    }

    try {
      player.seek(0);
    } catch (err) {
      return interaction.reply(C.v2(
        C.fail(`Failed to replay: ${err.message}`)
      ));
    }

    await interaction.reply(C.v2(
      C.ok(`Replaying **${track.title}** from the beginning.`)
    ));
  },
};