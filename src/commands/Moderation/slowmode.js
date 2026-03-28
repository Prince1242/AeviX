/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "slowmode",
  aliases: ["slow"],
  category: "Moderation",
  description: "Set channel slowmode",
  usage: "<seconds|off> [#channel]",
  args: true,
  cooldown: 3,
  userPerms: ["ManageChannels"],
  botPerms: ["ManageChannels"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const channel = message.mentions.channels.first() || message.channel;
    const input = args[0].toLowerCase();

    const seconds = input === "off" || input === "0" ? 0 : parseInt(input);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600)
      return message.reply(C.v2(C.fail("Provide a value between `0` and `21600` seconds (6 hours), or `off`.")));

    await channel.setRateLimitPerUser(seconds, message.author.tag);

    return message.reply(C.v2(
      C.ok(seconds === 0
        ? `Slowmode **disabled** in ${channel}.`
        : `Slowmode set to **${seconds}s** in ${channel}.`)
    ));
  },
};