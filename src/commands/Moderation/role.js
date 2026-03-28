/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "role",
  aliases: [],
  category: "Moderation",
  description: "Add or remove a role from a member",
  usage: "<@user> <@role>",
  args: true,
  cooldown: 3,
  userPerms: ["ManageRoles"],
  botPerms: ["ManageRoles"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first()
      || await client.users.fetch(args[0]?.replace(/[<@!>]/g, "")).catch(() => null);
    if (!user) return message.reply(C.v2(C.fail(`Usage: \`${prefix}role @user @role\``)));

    const member = message.guild.members.cache.get(user.id)
      || await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply(C.v2(C.fail("User not in server.")));

    const role = message.mentions.roles.first()
      || message.guild.roles.cache.get(args[1]?.replace(/[<@&>]/g, ""));
    if (!role) return message.reply(C.v2(C.fail("Provide a valid **role mention or ID**.")));

    if (role.managed) return message.reply(C.v2(C.fail("That role is **managed** by an integration.")));
    if (role.position >= message.guild.members.me.roles.highest.position)
      return message.reply(C.v2(C.fail("That role is **higher** than my highest role.")));
    if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId)
      return message.reply(C.v2(C.fail("That role is **higher or equal** to your highest role.")));

    const has = member.roles.cache.has(role.id);

    try {
      if (has) { await member.roles.remove(role); }
      else { await member.roles.add(role); }
    } catch (err) {
      return message.reply(C.v2(C.fail(`Failed: ${err.message}`)));
    }

    return message.reply(C.v2(
      C.ok(`${has ? "Removed" : "Added"} ${role} ${has ? "from" : "to"} **${user.tag}**.`)
    ));
  },
};