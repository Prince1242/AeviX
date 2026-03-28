/** @format */

const { PermissionFlagsBits } = require("discord.js");
const Components = require("../../custom/components");

module.exports = {
  name: "lock",
  aliases: [],
  category: "Moderation",
  description: "Lock a channel",
  usage: "[#channel] [reason]",
  cooldown: 3,
  userPerms: ["ManageChannels"],
  botPerms: ["ManageChannels"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const channel = message.mentions.channels.first() || message.channel;
    const reason = args.filter((a) => !a.startsWith("<#")).join(" ") || "No reason provided";

    const perms = channel.permissionOverwrites.cache.get(message.guild.id);
    if (perms?.deny.has(PermissionFlagsBits.SendMessages))
      return message.reply(C.v2(C.fail(`${channel} is already **locked**.`)));

    await channel.permissionOverwrites.edit(message.guild.id, {
      SendMessages: false, SendMessagesInThreads: false, CreatePublicThreads: false, AddReactions: false,
    }, { reason: `${message.author.tag}: ${reason}` });

    return message.reply(C.v2(C.ok(`🔒 ${channel} has been **locked**.\n${e.dot} Reason: ${reason}`)));
  },
};