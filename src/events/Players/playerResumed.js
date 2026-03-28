/** @format */

module.exports = {
  name: "playerResumed",
  run: async (client, player) => {
    const guild = client.guilds.cache.get(player.guildId);
    client.logger.log(
      `Player Resumed in ${guild?.name || player.guildId}`,
      "log"
    );
  },
};