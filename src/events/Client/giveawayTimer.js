/** @format */

const Giveaway = require("../../schema/giveaway");
const { endGiveaway } = require("../../utils/giveaway");

module.exports = {
  name: "ready",
  run: async (client) => {
    /* Check every 15 seconds for expired giveaways */
    setInterval(async () => {
      try {
        const expired = await Giveaway.find({
          ended: false,
          endsAt: { $lte: new Date() },
        });

        for (const giveaway of expired) {
          try {
            await endGiveaway(client, giveaway);
          } catch (err) {
            client.logger?.log(`[Giveaway] End error: ${err.message}`, "error");
            /* Mark as ended to prevent infinite retry */
            giveaway.ended = true;
            await giveaway.save().catch(() => null);
          }
        }
      } catch {}
    }, 15_000);

    client.logger.log("[Giveaway] Timer initialized", "ready");
  },
};