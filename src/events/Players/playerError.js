/** @format */

module.exports = {
  name: "playerError",
  run: async (client, player, error) => {
    const guildName = client.guilds.cache.get(player.guildId)?.name || player.guildId;

    /* Log with useful detail instead of [object Object] */
    const errorDetail =
      error instanceof Error
        ? error.message
        : typeof error === "object"
          ? JSON.stringify(error, null, 0).substring(0, 200)
          : String(error);

    client.logger.log(
      `Player Error [${guildName}]: ${errorDetail}`,
      "error"
    );

    /* Don't destroy — let Shoukaku handle reconnection */
  },
};