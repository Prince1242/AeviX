/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "kick",
  aliases: [],
  category: "Moderation",
  description: "Kick a member from the server",
  usage: "<user> [reason]",
  args: true,
  cooldown: 3,
  userPerms: ["KickMembers"],
  botPerms: ["KickMembers"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first()
      || await client.users.fetch(args[0]?.replace(/[<@!>]/g, "")).catch(() => null);
    if (!user) return message.reply(C.v2(C.fail("Provide a valid **user mention or ID**.")));

    const member = message.guild.members.cache.get(user.id)
      || await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply(C.v2(C.fail("That user is **not in this server**.")));

    const reason = args.slice(1).join(" ") || "No reason provided";

    if (user.id === message.author.id) return message.reply(C.v2(C.fail("You cannot kick yourself.")));
    if (user.id === client.user.id) return message.reply(C.v2(C.fail("I cannot kick myself.")));
    if (user.id === message.guild.ownerId) return message.reply(C.v2(C.fail("You cannot kick the server owner.")));
    if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId)
      return message.reply(C.v2(C.fail("That user has a **higher or equal role** than you.")));
    if (!member.kickable)
      return message.reply(C.v2(C.fail("I cannot kick that user.")));

    try {
      const dm = C.container(COLORS.warn)
        .addTextDisplayComponents(C.text(`### ${MARK}  You've been Kicked`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`${e.dot} **Server** · ${message.guild.name}\n${e.dot} **Reason** · ${reason}`))
        .addSeparatorComponents(C.separator()).addTextDisplayComponents(C.text(FOOTER));
      await user.send(C.v2(dm)).catch(() => null);
    } catch {}

    try { await member.kick(`${message.author.tag}: ${reason}`); }
    catch (err) { return message.reply(C.v2(C.fail(`Failed: ${err.message}`))); }

    return message.reply(C.v2(C.ok(`**${user.tag}** has been **kicked**.\n${e.dot} Reason: ${reason}`)));
  },
};