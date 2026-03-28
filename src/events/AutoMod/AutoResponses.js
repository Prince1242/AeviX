/** @format */

const arr = require("../../schema/ar");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;

    try {
      const ardata = await arr.findOne({ guildId: message.guild.id });
      if (!ardata?.autoresponses?.length) return;

      const msg = message.content.toLowerCase();

      for (const { trigger, response } of ardata.autoresponses) {
        if (msg === trigger.toLowerCase()) {
          await message.channel.send(response).catch(() => null);
          break;
        }
      }
    } catch (error) {
      console.error("[AUTOMOD] Autoresponder error:", error.message);
    }
  },
}