/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix Antinuke — Anti Bot Add
 *
 *  BUG FIX: Was listening to "guildBanAdd" (same as antiBan.js), causing
 *  double-handling of every ban. Corrected to "guildMemberAdd" to detect
 *  bot additions. antiUnverifiedBot.js handles UNVERIFIED bots specifically;
 *  this handler catches ALL unauthorized bot additions via the unified
 *  handleAntiNuke system with proper rate limiting.
 * ══════════════════════════════════════════════════════════════════════ */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    /* Only handle bots — human joins are irrelevant */
    if (!member.user.bot) return;

    await handleAntiNuke(client, member.guild, "antiBotAdd", 28, {
      label: "Bot Addition",
      recover: () => member.ban({ reason: "Aevix Antinuke: Unauthorized bot addition" }).catch(() => null),
      fields: [
        { name: "Bot", value: `${member.user.tag} (\`${member.id}\`)` },
        { name: "Verified", value: member.user.flags?.has("VerifiedBot") ? "Yes" : "No" },
      ],
    });
  },
};