/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "purge",
  aliases: ["clear", "prune"],
  category: "Moderation",
  description: "Bulk delete messages",
  usage: "<amount> [@user]",
  args: true,
  cooldown: 5,
  userPerms: ["ManageMessages"],
  botPerms: ["ManageMessages", "ReadMessageHistory"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 1 || amount > 100)
      return message.reply(C.v2(C.fail("Amount must be between **1** and **100**.")));

    const targetUser = message.mentions.users.first();

    await message.delete().catch(() => null);

    let messages = await message.channel.messages.fetch({ limit: amount });
    if (targetUser) messages = messages.filter((m) => m.author.id === targetUser.id);
    messages = messages.filter((m) => m.deletable);

    if (messages.size === 0) return message.channel.send(C.v2(C.fail("No deletable messages found."))).then((m) => setTimeout(() => m.delete().catch(() => null), 5000));

    const deleted = await message.channel.bulkDelete(messages, true).catch(() => null);
    if (!deleted) return;

    const msg = await message.channel.send(C.v2(
      C.ok(`Deleted **${deleted.size}** message(s)${targetUser ? ` from **${targetUser.tag}**` : ""}.`)
    ));
    setTimeout(() => msg.delete().catch(() => null), 5000);
  },
};