/** @format */

const Warn = require("../../schema/warn");
const WarnConfig = require("../../schema/warnconfig");
const { formatDuration } = require("../../utils/convert");
const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "warn",
  aliases: [],
  category: "Moderation",
  description: "Issue a warning to a member",
  usage: "<user> [reason]",
  args: true,
  cooldown: 3,
  userPerms: ["ModerateMembers"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first()
      || await client.users.fetch(args[0]?.replace(/[<@!>]/g, "")).catch(() => null);
    if (!user) return message.reply(C.v2(C.fail("Provide a valid **user mention or ID**.")));
    if (user.bot) return message.reply(C.v2(C.fail("Cannot warn a bot.")));
    if (user.id === message.author.id) return message.reply(C.v2(C.fail("Cannot warn yourself.")));

    const member = message.guild.members.cache.get(user.id)
      || await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply(C.v2(C.fail("User not in server.")));
    if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId)
      return message.reply(C.v2(C.fail("Higher or equal role.")));

    const reason = args.slice(1).join(" ") || "No reason provided";
    const warnId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    await Warn.create({ guildId: message.guild.id, userId: user.id, moderatorId: message.author.id, reason, warnId });
    const totalWarns = await Warn.countDocuments({ guildId: message.guild.id, userId: user.id });

    /* ── Auto-escalation ─────────────────────────── */
    let escalation = null;
    const config = await WarnConfig.findOne({ guildId: message.guild.id });
    if (config?.tiers?.length) {
      const tier = [...config.tiers].sort((a, b) => b.count - a.count).find((t) => totalWarns >= t.count);
      if (tier) {
        try {
          if (tier.action === "mute" && member.moderatable) { const d = tier.duration ? tier.duration * 60_000 : 3_600_000; await member.timeout(d, `Warn escalation (${totalWarns})`); escalation = `Timed out for ${formatDuration(d)}`; }
          if (tier.action === "kick" && member.kickable) { await member.kick(`Warn escalation (${totalWarns})`); escalation = "Kicked"; }
          if (tier.action === "ban" && member.bannable) { await message.guild.members.ban(user.id, { reason: `Warn escalation (${totalWarns})` }); escalation = "Banned"; }
        } catch {}
      }
    }

    /* DM */
    try { await user.send(C.v2(C.container(COLORS.warn)
      .addTextDisplayComponents(C.text(`### ${MARK}  You've been Warned`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`${e.dot} **Server** · ${message.guild.name}\n${e.dot} **Reason** · ${reason}\n${e.dot} **Warnings** · \`${totalWarns}\`${escalation ? `\n⚠️ ${escalation}` : ""}`))
      .addSeparatorComponents(C.separator()).addTextDisplayComponents(C.text(FOOTER))
    )).catch(() => null); } catch {}

    const body = [`**${user.tag}** warned · \`${totalWarns}\` total · ID: \`${warnId}\``, `${e.dot} ${reason}`];
    if (escalation) body.push(`⚠️ Escalation: **${escalation}**`);

    return message.reply(C.v2(C.ok(body.join("\n"))));
  },
};