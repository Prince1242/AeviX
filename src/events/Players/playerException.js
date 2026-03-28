/** @format */

const { sendTemp } = require("../../utils/response");

module.exports = {
  name: "playerException",
  run: async (client, player, reason) => {
    const errorMsg = reason?.exception?.message || reason?.message || reason || "Unknown";
    client.logger.log(`Player Exception [${player.guildId}]: ${errorMsg}`, "error");

    const textChannel = client.channels.cache.get(player.textId);
    if (textChannel) {
      const C = client.components;
      sendTemp(textChannel,
        C.fail(`Track error — skipping\n\`\`\`${errorMsg.substring(0, 120)}\`\`\``),
        client, 10_000
      );
    }

    try { if (player.queue.size > 0) player.skip(); } catch {}
  },
};