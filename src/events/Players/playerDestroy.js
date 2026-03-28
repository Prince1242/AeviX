/** @format */

const { WebhookClient, EmbedBuilder } = require("discord.js");
const { Webhooks: { player_delete } } = require("../../config.js");

module.exports = {
  name: "playerDestroy",
  run: async (client, player) => {
    const guildName = client.guilds.cache.get(player.guildId)?.name || "Unknown";

    if (client.voiceHealthMonitor) client.voiceHealthMonitor.stopMonitoring(player.guildId);

    if (player.voiceId) {
      client.rest.put(`/channels/${player.voiceId}/voice-status`, { body: { status: "" } }).catch(() => null);
    }

    try {
      new WebhookClient({ url: player_delete }).send({
        embeds: [new EmbedBuilder().setColor(client.color)
          .setAuthor({ name: "Player Destroyed", iconURL: client.user.displayAvatarURL() })
          .setDescription(`**Server:** ${guildName}\n**ID:** ${player.guildId}`)
          .setTimestamp()],
      }).catch(() => null);
    } catch {}

    client.logger.log(`Player Destroyed in ${guildName} [${player.guildId}]`, "music");

    /* Cleanup */
    const collector = player.data.get("collector");
    if (collector && !collector.ended) collector.stop("playerDestroy");

    try {
      const npMsg = player.data.get("message") || player.data.get("nowPlayingMessage");
      if (npMsg?.deletable) await npMsg.delete().catch(() => null);
    } catch {}

    const inactivityTimeout = player.data.get("inactivityTimeout");
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    const reconnectTimeout = player.data.get("reconnectTimeout");
    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    for (const key of [
      "message", "nowPlayingMessage", "collector", "autoplay", "autoplaySystem",
      "autoplayHistory", "autoplayLock", "lastTrack", "playedTracks",
      "autoplayInProgress", "recentAutoplayIds", "retryAttempt",
      "monitorStartTime", "inactivityTimeout", "reconnectTimeout",
      "reconnectAttempts", "idleSince",
    ]) player.data.delete(key);
  },
};