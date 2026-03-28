/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "untimeout",
  aliases: ["unmute", "uto"],
  category: "Moderation",
  description: "Remove a member's timeout",
  usage: "<user> [reason]",
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
    if (!member.isCommunicationDisabled()) return message.reply(C.v2(C.fail("User is **not timed out**.")));
    if (!member.moderatable) return message.reply(C.v2(C.fail("I can't modify that user.")));

    const reason = args.slice(1).join(" ") || "No reason provided";

    try { await member.timeout(null, `${message.author.tag}: ${reason}`); }
    catch (err) { return message.reply(C.v2(C.fail(`Failed: ${err.message}`))); }

    return message.reply(C.v2(C.ok(`**${user.tag}** timeout **removed**.\n${e.dot} Reason: ${reason}`)));
  },
};