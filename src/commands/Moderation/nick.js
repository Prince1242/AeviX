/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "nick",
  aliases: ["nickname", "setnick"],
  category: "Moderation",
  description: "Change a member's nickname",
  usage: "<@user> <new nickname | reset>",
  args: true,
  cooldown: 3,
  userPerms: ["ManageNicknames"],
  botPerms: ["ManageNicknames"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first()
      || await client.users.fetch(args[0]?.replace(/[<@!>]/g, "")).catch(() => null);
    if (!user) return message.reply(C.v2(C.fail(`Usage: \`${prefix}nick @user <nickname|reset>\``)));

    const member = message.guild.members.cache.get(user.id)
      || await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply(C.v2(C.fail("User not in server.")));
    if (!member.manageable) return message.reply(C.v2(C.fail("I can't manage that user's nickname.")));

    const newNick = args.slice(1).join(" ");
    if (!newNick) return message.reply(C.v2(C.fail("Provide a **nickname** or `reset`.")));

    const reset = newNick.toLowerCase() === "reset";
    const old = member.displayName;

    try {
      await member.setNickname(reset ? null : newNick.substring(0, 32), message.author.tag);
    } catch (err) {
      return message.reply(C.v2(C.fail(`Failed: ${err.message}`)));
    }

    return message.reply(C.v2(
      C.ok(reset
        ? `**${user.tag}** nickname **reset** to default.`
        : `**${user.tag}** nickname: **${old}** → **${newNick.substring(0, 32)}**`)
    ));
  },
};