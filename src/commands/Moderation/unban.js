/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "unban",
  aliases: [],
  category: "Moderation",
  description: "Unban a user from the server",
  usage: "<user_id> [reason]",
  args: true,
  cooldown: 3,
  userPerms: ["BanMembers"],
  botPerms: ["BanMembers"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const rawId = args[0].replace(/[<@!>]/g, "").trim();
    const reason = args.slice(1).join(" ") || "No reason provided";

    if (!/^\d{17,20}$/.test(rawId))
      return message.reply(C.v2(C.fail("Provide a valid **user ID**.")));

    const ban = await message.guild.bans.fetch(rawId).catch(() => null);
    if (!ban) return message.reply(C.v2(C.fail(`User \`${rawId}\` is not banned.`)));

    try {
      await message.guild.members.unban(rawId, `${message.author.tag}: ${reason}`);
    } catch (err) {
      return message.reply(C.v2(C.fail(`Failed to unban: ${err.message}`)));
    }

    return message.reply(C.v2(
      C.ok(`**${ban.user.tag}** has been **unbanned**.\n${e.dot} Reason: ${reason}`)
    ));
  },
};