/** @format */

const lastErrorTime = new Map();
const ERROR_THROTTLE_MS = 60_000;

module.exports = {
  name: "error",
  run: async (client, name, error) => {
    const errorKey = `${name}_${error.code || error.message}`;
    const now = Date.now();
    const lastTime = lastErrorTime.get(errorKey) || 0;

    /* Throttle ETIMEDOUT spam */
    if (error.code === "ETIMEDOUT" || error.message?.includes("ETIMEDOUT")) {
      if (now - lastTime < ERROR_THROTTLE_MS) return;
      lastErrorTime.set(errorKey, now);
      client.logger.log(
        `Lavalink "${name}" connection timeout (will retry automatically)`,
        "warn"
      );
      return;
    }

    client.logger.log(`Lavalink "${name}" error: ${error}`, "error");

    /* Handle session loss — clean up affected players */
    if (error?.message?.includes("Session not found")) {
      client.logger.log(
        `Session lost for node "${name}", cleaning up affected players...`,
        "warn"
      );

      const players = [...client.manager.players.values()];
      for (const player of players) {
        try {
          if (player.node?.name === name) {
            client.logger.log(
              `Cleaning up player for guild ${player.guildId} due to session loss`,
              "warn"
            );
            client.manager.players.delete(player.guildId);

            if (client.voiceHealthMonitor) {
              client.voiceHealthMonitor.stopMonitoring(player.guildId);
            }
          }
        } catch (e) {
          client.logger.log(
            `Error cleaning up player ${player.guildId}: ${e.message}`,
            "error"
          );
        }
      }
    }
  },
};