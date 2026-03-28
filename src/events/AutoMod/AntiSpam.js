/** @format */

const AntiSpam = require("../../schema/antispam");
const { PermissionsBitField } = require("discord.js");
const { sendTemp } = require("../../utils/response");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;
    if (message.member.permissions.has("Administrator")) return;

    const data = await AntiSpam.findOne({ guildId: message.guild.id });
    if (!data?.isEnabled) return;

    const userId = message.author.id;
    if ((data.whitelistUsers || []).includes(userId) ||
        message.member.roles.cache.some((r) => (data.whitelistRoles || []).includes(r.id))) return;

    const botMember = message.guild.members.me;
    if (botMember && message.member.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) return;

    const now = Date.now();
    const timeframeMs = (data.timeframe || 10) * 1000;
    const userMessages = client.spamMap.get(userId) || [];
    userMessages.push(now);
    const filtered = userMessages.filter((t) => now - t <= timeframeMs);
    client.spamMap.set(userId, filtered);

    const threshold = data.messageThreshold || 5;
    if (filtered.length > threshold) {
      await message.delete().catch(() => null);
      client.spamMap.delete(userId);

      if (botMember?.permissions.has(PermissionsBitField.Flags.ModerateMembers) && message.member.moderatable) {
        await message.member.timeout(60_000, "Aevix: Spam").catch(() => null);
      }

      sendTemp(message.channel,
        client.components.caution(`**${message.author.username}** muted 1 min — spam detected`),
        client, 8_000
      );
    }
  },
};