/** @format */

const { parseDuration } = require("../../utils/giveaway");
const { formatDuration } = require("../../utils/convert");
const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "timeout",
  aliases: ["mute", "to"],
  category: "Moderation",
  description: "Timeout a member",
  usage: "<user> <duration> [reason]",
  args: true,
  cooldown: 3,
  userPerms: ["ModerateMembers"],
  botPerms: ["ModerateMembers"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first()
      || await client.users.fetch(args[0]?.replace(/[<@!>]/g, "")).catch(() => null);
    if (!user) return message.reply(C.v2(C.fail("Provide a valid **user mention or ID**.")));

    const member = message.guild.members.cache.get(user.id)
      || await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply(C.v2(C.fail("User is **not in this server**.")));

    const ms = parseDuration(args[1]);
    if (!ms || ms < 5000) return message.reply(C.v2(C.fail(`Invalid duration. Use \`${prefix}timeout @user 10m reason\``)));
    if (ms > 28 * 24 * 60 * 60 * 1000) return message.reply(C.v2(C.fail("Max timeout is **28 days**.")));

    const reason = args.slice(2).join(" ") || "No reason provided";

    if (user.id === message.author.id) return message.reply(C.v2(C.fail("You cannot timeout yourself.")));
    if (user.id === message.guild.ownerId) return message.reply(C.v2(C.fail("Cannot timeout the server owner.")));
    if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId)
      return message.reply(C.v2(C.fail("Higher or equal role.")));
    if (!member.moderatable) return message.reply(C.v2(C.fail("I can't moderate that user.")));

    try {
      const dm = C.container(COLORS.warn)
        .addTextDisplayComponents(C.text(`### ${MARK}  You've been Timed Out`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`${e.dot} **Server** · ${message.guild.name}\n${e.dot} **Duration** · ${formatDuration(ms)}\n${e.dot} **Reason** · ${reason}`))
        .addSeparatorComponents(C.separator()).addTextDisplayComponents(C.text(FOOTER));
      await user.send(C.v2(dm)).catch(() => null);
    } catch {}

    try { await member.timeout(ms, `${message.author.tag}: ${reason}`); }
    catch (err) { return message.reply(C.v2(C.fail(`Failed: ${err.message}`))); }

    const expiresTs = Math.round((Date.now() + ms) / 1000);
    return message.reply(C.v2(
      C.ok(`**${user.tag}** timed out for **${formatDuration(ms)}** (expires <t:${expiresTs}:R>)\n${e.dot} Reason: ${reason}`)
    ));
  },
};