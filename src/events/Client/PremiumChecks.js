/** @format */

const Noprefix = require("../../schema/noprefix");
const CLEANUP_INTERVAL = 5 * 60 * 1000;

async function cleanExpiredPermissions(client) {
  try {
    const expired = await Noprefix.find({ expiresAt: { $lt: new Date(), $ne: null } });
    if (!expired.length) return;

    const C = client.components;
    for (const entry of expired) {
      try {
        const user = await client.users.fetch(entry.userId).catch(() => null);
        if (user) {
          await user.send(C.v2(
            C.caution("Your **NoPrefix** access has expired. Contact the bot owner to renew it.")
          )).catch(() => null);
        }
      } catch {}
      await Noprefix.deleteOne({ _id: entry._id }).catch(() => null);
      client.logger.log(`[Premium] Expired NoPrefix: ${entry.userId}`, "log");
    }
  } catch (e) { client.logger.log(`[Premium] Cleanup error: ${e.message}`, "error"); }
}

module.exports = (client) => {
  if (!client) return;
  setTimeout(() => {
    cleanExpiredPermissions(client);
    setInterval(() => cleanExpiredPermissions(client), CLEANUP_INTERVAL);
  }, 30_000);
  client.logger.log("[Premium] Expiry handler initialized", "ready");
};