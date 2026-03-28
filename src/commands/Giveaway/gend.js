/** @format */

const Giveaway = require("../../schema/giveaway");
const { endGiveaway } = require("../../utils/giveaway");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "gend",
  aliases: ["giveawayend"],
  category: "Giveaway",
  description: "End a giveaway early",
  usage: "<message ID>",
  args: true,
  cooldown: 5,
  userPerms: ["ManageGuild"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const messageId = args[0];

    const giveaway = await Giveaway.findOne({
      messageId,
      guildId: message.guildId,
      ended: false,
    });

    if (!giveaway)
      return message.reply(C.v2(C.fail("No active giveaway found with that message ID.")));

    try {
      await endGiveaway(client, giveaway);
      return message.reply(C.v2(C.ok(`Giveaway for **${giveaway.prize}** has been **ended**!`)));
    } catch (err) {
      return message.reply(C.v2(C.fail(`Failed to end giveaway: ${err.message}`)));
    }
  },
};
