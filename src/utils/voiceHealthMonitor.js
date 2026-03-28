/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Voice Health Monitor
 *
 *  Periodic health checks for voice connections. Handles 24/7
 *  reconnection, idle detection, and voice status updates.
 * ══════════════════════════════════════════════════════════════════════ */

class VoiceHealthMonitor {
  constructor(client) {
    this.client = client;
    this.healthChecks = new Map();
    this.CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes
    this.IDLE_THRESHOLD = 10 * 60 * 1000; // 10 minutes
  }

  startMonitoring(player) {
    if (!player?.guildId) return;
    if (this.healthChecks.has(player.guildId)) return;

    const interval = setInterval(async () => {
      await this.performHealthCheck(player);
    }, this.CHECK_INTERVAL);

    this.healthChecks.set(player.guildId, interval);

    if (!player.data) player.data = new Map();
    player.data.set("monitorStartTime", Date.now());
  }

  stopMonitoring(guildId) {
    const interval = this.healthChecks.get(guildId);
    if (interval) {
      clearInterval(interval);
      this.healthChecks.delete(guildId);

      const player = this.client.manager?.players.get(guildId);
      if (player?.data) {
        const timeout = player.data.get("reconnectTimeout");
        if (timeout) {
          clearTimeout(timeout);
          player.data.delete("reconnectTimeout");
          player.data.delete("reconnectAttempts");
        }
      }
    }
  }

  async performHealthCheck(player) {
    try {
      const currentPlayer = this.client.manager?.players.get(player.guildId);
      if (!currentPlayer) {
        this.stopMonitoring(player.guildId);
        return;
      }

      const guild = this.client.guilds.cache.get(player.guildId);
      if (!guild) {
        this.stopMonitoring(player.guildId);
        return;
      }

      const voiceChannel = guild.channels.cache.get(player.voiceId);
      if (!voiceChannel) {
        this.stopMonitoring(player.guildId);
        return;
      }

      const botMember = guild.members.cache.get(this.client.user.id);
      if (!botMember?.voice?.channelId) {
        /* Bot not in VC — check 24/7 */
        const TwoFourSeven = require("../schema/247");
        const is247 = await TwoFourSeven.findOne({ Guild: player.guildId });

        if (is247) {
          this.client.logger?.log(
            `[VoiceHealth] Bot not in VC but 24/7 enabled for guild ${player.guildId}, reconnecting...`,
            "log"
          );

          try {
            player.setVoiceChannel(is247.VoiceId);
            if (player.state === "DISCONNECTED" || player.state === "DESTROYED") {
              await player.connect();
            }
            player.data?.delete("reconnectAttempts");
            return;
          } catch (e) {
            if (e.message?.includes("already connected")) return;

            const attempts = (player.data?.get("reconnectAttempts") || 0) + 1;
            player.data?.set("reconnectAttempts", attempts);

            this.client.logger?.log(
              `[VoiceHealth] Reconnect attempt ${attempts} failed: ${e.message}`,
              "error"
            );

            const existing = player.data?.get("reconnectTimeout");
            if (existing) clearTimeout(existing);

            const retry = setTimeout(async () => {
              await this.performHealthCheck(player);
            }, 15_000);
            player.data?.set("reconnectTimeout", retry);
            return;
          }
        }

        this.stopMonitoring(player.guildId);
        return;
      }

      /* Update voice status if playing */
      if (player.playing && player.queue?.current) {
        this.client.rest
          .put(`/channels/${player.voiceId}/voice-status`, {
            body: {
              status: `${this.client.emoji.playing} ${player.queue.current.title?.substring(0, 19) || "Playing"}`,
            },
          })
          .catch(() => null);
      }
    } catch (error) {
      this.client.logger?.log(
        `[VoiceHealth] Health check error for ${player.guildId}: ${error.message}`,
        "error"
      );
    }
  }

  updateActivity(guildId) {
    const player = this.client.manager?.players.get(guildId);
    if (player?.data) {
      player.data.set("lastActivityTime", Date.now());
    }
  }

  stopAll() {
    for (const [, interval] of this.healthChecks) {
      clearInterval(interval);
    }
    this.healthChecks.clear();
  }
}

module.exports = VoiceHealthMonitor;