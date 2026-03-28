/** @format */

const {
  fetchSettings, resolveExecutor, sendLog, punish,
  getModule, trackAction, getActionCount, clearAction,
} = require("../../utils/antinuke");
const { COLORS: BRAND_COLORS } = require("../../custom/components");

module.exports = {
  name: "webhooksUpdate",
  run: async (client, channel) => {
    try {
      const guild = channel.guild;
      const data = await fetchSettings(guild.id);
      if (!data?.isEnabled) return;

      const mod = getModule(data, "antiWebhook");
      if (!mod.enabled) return;

      const auditTypes = [
        { type: 50, label: "Webhook Created" },
        { type: 52, label: "Webhook Deleted" },
        { type: 51, label: "Webhook Updated" },
      ];

      for (const audit of auditTypes) {
        const result = await resolveExecutor(guild, client, data, audit.type, { maxAge: 5000 });
        if (!result) continue;

        const { executor, member, isWhitelisted } = result;

        if (isWhitelisted) {
          await sendLog(client, guild, data, {
            title: `Whitelisted: ${audit.label}`, isWhitelisted: true,
            description: `**${executor.tag}** — whitelisted.`,
          });
          break;
        }

        if (audit.type === 50) {
          const webhooks = await channel.fetchWebhooks().catch(() => null);
          const target = webhooks?.find((wh) => wh.owner?.id === executor.id);
          if (target) await target.delete().catch(() => null);
        }

        trackAction(guild.id, executor.id, "antiWebhook");
        const count = getActionCount(guild.id, executor.id, "antiWebhook", mod.timeframe * 1000);
        const exceeded = count >= mod.threshold;

        if (exceeded) {
          await punish(guild, member, data.punishment || "ban", `Aevix Antinuke: ${audit.label}`);
          clearAction(guild.id, executor.id, "antiWebhook");
        }

        await sendLog(client, guild, data, {
          title: exceeded ? `${audit.label} — Punished` : `${audit.label} — Reverted`,
          description: `**${executor.tag}** (\`${executor.id}\`) — ${exceeded ? `punished (${data.punishment || "ban"})` : `tracked (${count}/${mod.threshold})`}`,
          color: exceeded ? undefined : BRAND_COLORS.warn,
          fields: [{ name: "Channel", value: `${channel.name} (\`${channel.id}\`)` }],
        });
        break;
      }
    } catch (e) {
      console.error("[ANTINUKE] webhooksUpdate error:", e);
    }
  },
};