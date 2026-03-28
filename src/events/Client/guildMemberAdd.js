/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Guild Member Add (Welcome System)
 *
 *  FIX: Was passing `settings` to sendWelcome() which only accepts
 *  `member`. Removed the redundant getSettings call — sendWelcome()
 *  fetches settings internally.
 * ══════════════════════════════════════════════════════════════════════ */

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    if (!member?.guild) return;

    try {
      await client.util.sendWelcome(member);
    } catch (err) {
      client.logger.log(
        `[Welcome] Error for ${member.guild.name}: ${err.message}`,
        "error"
      );
    }
  },
};