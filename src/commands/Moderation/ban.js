/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "ban",
  aliases: ["b"],
  category: "Moderation",
  description: "Ban a member from the server",
  usage: "<user> [reason]",
  args: true,
  cooldown: 3,
  userPerms: ["BanMembers"],
  botPerms: ["BanMembers"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first()
      || await client.users.fetch(args[0]?.replace(/[<@!>]/g, "")).catch(() => null);
    if (!user) return message.reply(C.v2(C.fail("Provide a valid **user mention or ID**.")));

    const member = message.guild.members.cache.get(user.id)
      || await message.guild.members.fetch(user.id).catch(() => null);

    const reason = args.slice(1).join(" ") || "No reason provided";

    if (user.id === message.author.id) return message.reply(C.v2(C.fail("You cannot ban yourself.")));
    if (user.id === client.user.id) return message.reply(C.v2(C.fail("I cannot ban myself.")));
    if (user.id === message.guild.ownerId) return message.reply(C.v2(C.fail("You cannot ban the server owner.")));

    if (member) {
      if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId)
        return message.reply(C.v2(C.fail("That user has a **higher or equal role** than you.")));
      if (!member.bannable)
        return message.reply(C.v2(C.fail("I cannot ban that user.")));

      try {
        const dm = C.container(COLORS.error)
          .addTextDisplayComponents(C.text(`### ${MARK}  You've been Banned`))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(`${e.dot} **Server** · ${message.guild.name}\n${e.dot} **Reason** · ${reason}`))
          .addSeparatorComponents(C.separator()).addTextDisplayComponents(C.text(FOOTER));
        await user.send(C.v2(dm)).catch(() => null);
      } catch {}
    }

    try { await message.guild.members.ban(user.id, { reason: `${message.author.tag}: ${reason}`, deleteMessageSeconds: 0 }); }
    catch (err) { return message.reply(C.v2(C.fail(`Failed: ${err.message}`))); }

    return message.reply(C.v2(C.ok(`**${user.tag}** has been **banned**.\n${e.dot} Reason: ${reason}`)));
  },
};