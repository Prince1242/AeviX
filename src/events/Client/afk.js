/** @format */

const afk = require("../../schema/afk");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;

    const C = client.components;

    /* ── Someone mentioned an AFK user ──────────── */
    if (message.mentions.members?.size) {
      for (const [, mentioned] of message.mentions.members) {
        const data = await afk.findOne({ Guild: message.guildId, Member: mentioned.id });
        if (data) {
          const msg = await message.reply(C.v2(
            C.caution(`**${mentioned.displayName}** is AFK · ${data.Reason} · <t:${Math.round(data.Time / 1000)}:R>`)
          )).catch(() => null);
          if (msg) setTimeout(() => msg.delete().catch(() => null), 8_000);
          return;
        }
      }
    }

    /* ── AFK user returned ──────────────────────── */
    const authorData = await afk.findOneAndDelete({ Guild: message.guildId, Member: message.author.id });
    if (authorData) {
      const member = message.member;
      if (member.manageable && member.displayName.startsWith("[AFK] ")) {
        await member.setNickname(member.displayName.replace("[AFK] ", "")).catch(() => null);
      }
      const msg = await message.reply(C.v2(
        C.ok(`Welcome back **${message.author.username}** · away since <t:${Math.round(authorData.Time / 1000)}:R>`)
      )).catch(() => null);
      if (msg) setTimeout(() => msg.delete().catch(() => null), 5_000);
    }
  },
};