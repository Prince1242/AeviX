/** @format */

const Afk = require("../../schema/afk");
const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "afk",
  aliases: [],
  category: "Utility",
  description: "Set or remove your AFK status",
  usage: "[reason]",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const guildId = message.guild.id;
    const userId = message.author.id;

    /* ── Check if already AFK → remove ───────────── */
    const existing = await Afk.findOneAndDelete({ Guild: guildId, Member: userId });
    if (existing) {
      if (message.member.manageable && message.member.displayName.startsWith("[AFK] ")) {
        await message.member.setNickname(message.member.displayName.replace("[AFK] ", "")).catch(() => null);
      }
      return message.reply(C.v2(
        C.ok(`Welcome back **${message.author.displayName}**! AFK removed.`)
      ));
    }

    /* ── Set AFK ─────────────────────────────────── */
    const reason = args.join(" ") || "AFK";

    await Afk.findOneAndUpdate(
      { Guild: guildId, Member: userId },
      { Guild: guildId, Member: userId, Reason: reason, Time: Date.now() },
      { upsert: true }
    );

    if (message.member.manageable && !message.member.displayName.startsWith("[AFK] ")) {
      await message.member.setNickname(`[AFK] ${message.member.displayName}`.substring(0, 32)).catch(() => null);
    }

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  AFK Set`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Status** · ${reason}\n` +
        `-# I'll notify anyone who mentions you.`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};