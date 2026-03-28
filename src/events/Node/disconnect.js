/** @format */

module.exports = {
  name: "disconnect",
  run: async (client, name, players, moved) => {
    if (moved) {
      client.logger.log(
        `Lavalink "${name}": Players moved to another node`,
        "log"
      );
      return;
    }

    client.logger.log(`Lavalink "${name}": Disconnected`, "warn");

    /* Clean up stranded players */
    if (players && typeof players[Symbol.iterator] === "function") {
      for (const player of players) {
        try {
          if (player.connection) player.connection.disconnect();
        } catch {
          /* Silent cleanup */
        }
      }
    }
  },
};