/** @format */

const Components = require("../../custom/components");
const { safeDestroyPlayer } = require("../../utils/playerUtils");

module.exports = {
  name: "stop",
  description: "Stop playback, clear the queue, and disconnect",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  run: async (client, interaction) => {
    const C = client.components;
    const player = client.manager.players.get(interaction.guildId);

    player.queue.clear();
    player.data?.delete("autoplay");
    player.setLoop("none");

    /* Clear VC status */
    client.rest
      .put(`/channels/${player.voiceId}/voice-status`, { body: { status: "" } })
      .catch(() => null);

    if (client.voiceHealthMonitor)
      client.voiceHealthMonitor.stopMonitoring(interaction.guildId);

    await safeDestroyPlayer(player);

    await interaction.reply(C.v2(
      C.ok("Stopped playback and disconnected.")
    ));
  },
};