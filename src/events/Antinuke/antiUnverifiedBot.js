/** @format */

const {
  fetchSettings, resolveExecutor, sendLog, punish,
  getModule, trackAction, getActionCount, clearAction,
} = require("../../utils/antinuke");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    try {
      if (!member.user.bot || member.user.flags?.has("VerifiedBot")) return;

      const data = await fetchSettings(member.guild.id);
      if (!data?.isEnabled) return;

      const mod = getModule(data, "antiBotAdd");
      if (!mod.enabled) return;

      const result = await resolveExecutor(member.guild, client, data, 28);
      if (!result) return;

      const { executor, isWhitelisted } = result;
      const botWhitelisted = (data.whitelistUsers || []).includes(member.id);

      if (isWhitelisted || botWhitelisted) {
        return sendLog(client, member.guild, data, {
          title: "Whitelisted Bot Addition", isWhitelisted: true,
          description: `**${executor.tag}** added **${member.user.tag}** — whitelisted.`,
        });
      }

      await member.ban({ reason: "Aevix Antinuke: Unverified bot" }).catch(() => null);

      trackAction(member.guild.id, executor.id, "antiBotAdd");
      const count = getActionCount(member.guild.id, executor.id, "antiBotAdd", mod.timeframe * 1000);
      const exceeded = count >= mod.threshold;

      if (exceeded) {
        await punish(member.guild, result.member, data.punishment || "ban", "Aevix Antinuke: Added unverified bot");
        clearAction(member.guild.id, executor.id, "antiBotAdd");
      }

      await sendLog(client, member.guild, data, {
        title: exceeded ? "Unverified Bot — Punished" : "Unverified Bot — Removed",
        description: `**${executor.tag}** added unverified bot **${member.user.tag}**.\n` +
          (exceeded ? `Executor ${data.punishment || "ban"}ned.` : "Bot removed, executor tracked."),
      });
    } catch (e) {
      console.error("[ANTINUKE] antiUnverifiedBot error:", e);
    }
  },
};