/** @format */

const {
  fetchSettings, sendLog, punish,
  getModule, trackAction, getActionCount, clearAction,
} = require("../../utils/antinuke");
const { COLORS: BRAND_COLORS } = require("../../custom/components");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    try {
      if (!message.guild || message.author.bot || !message.mentions.everyone) return;

      const data = await fetchSettings(message.guild.id);
      if (!data?.isEnabled) return;

      const mod = getModule(data, "antiEveryone");
      if (!mod.enabled) return;

      const m = message.member;
      const authorized = [
        message.guild.ownerId, client.user.id,
        ...(data.extraOwners || []), ...(data.whitelistUsers || []),
      ];
      const hasWLRole = m.roles.cache.some((r) => (data.whitelistRoles || []).includes(r.id));

      if (authorized.includes(m.id) || hasWLRole ||
          m.permissions.has("Administrator") ||
          m.permissions.has("MentionEveryone")) return;

      await message.delete().catch(() => null);

      trackAction(message.guild.id, m.id, "antiEveryone");
      const count = getActionCount(message.guild.id, m.id, "antiEveryone", mod.timeframe * 1000);
      const exceeded = count >= mod.threshold;

      if (exceeded) {
        await punish(message.guild, m, data.punishment || "ban", "Aevix Antinuke: Unauthorized mass mention");
        clearAction(message.guild.id, m.id, "antiEveryone");
      }

      await sendLog(client, message.guild, data, {
        title: exceeded ? "Mass Mention — Punished" : "Mass Mention — Deleted",
        description: `**${message.author.tag}** used @everyone/@here without permission.`,
        color: exceeded ? BRAND_COLORS.error : BRAND_COLORS.warn,
        fields: [
          { name: "Channel", value: `${message.channel}` },
          { name: "Action", value: exceeded ? `Deleted + ${data.punishment || "ban"}` : "Message deleted" },
        ],
      });
    } catch (e) {
      console.error("[ANTINUKE] antiEveryone error:", e);
    }
  },
};