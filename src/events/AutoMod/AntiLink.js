/** @format */

const { PermissionsBitField } = require("discord.js");
const db = require("../../schema/antilink");
const { sendTemp } = require("../../utils/response");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;

    const data = await db.findOne({ guildId: message.guild.id });
    if (!data?.isEnabled) return;

    const botMember = message.guild.members.me;
    if (!botMember) return;

    if (data.whitelistUsers?.includes(message.author.id) ||
        message.member.roles.cache.some((r) => (data.whitelistRoles || []).includes(r.id))) return;
    if (message.member.roles.highest.comparePositionTo(botMember.roles.highest) >= 0 ||
        message.member.permissions.has("Administrator")) return;
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    if (!/(?:https?:\/\/|discord\.gg\/|discord\.com\/invite\/)/gi.test(message.content)) return;

    try {
      await message.delete();
      if (botMember.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        await message.member.timeout(5 * 60 * 1000, "Aevix: Prohibited link").catch(() => null);
      }
      sendTemp(message.channel,
        client.components.caution(`**${message.author.username}** muted 5 min — prohibited link`),
        client, 8_000
      );
    } catch {}
  },
};