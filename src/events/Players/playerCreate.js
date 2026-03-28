/** @format */

module.exports = {
  name: "playerCreate",
  run: async (client, player) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    client.logger.log(`Player Created in ${guild.name} [${player.guildId}]`, "music");

    if (!player.data) player.data = new Map();
    player.data.set("lastTrack", null);
    player.data.set("autoplay", false);
    player.data.set("autoplayHistory", []);

    if (client.voiceHealthMonitor) client.voiceHealthMonitor.startMonitoring(player);

    client.rest.put(`/channels/${player.voiceId}/voice-status`, {
      body: { status: `${client.prefix}play` },
    }).catch(() => null);
  },
};