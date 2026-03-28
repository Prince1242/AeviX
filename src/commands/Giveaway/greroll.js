/** @format */

const Giveaway = require("../../schema/giveaway");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "greroll",
  aliases: ["giveawayreroll", "reroll"],
  category: "Giveaway",
  description: "Re-roll a giveaway winner",
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
      ended: true,
    });

    if (!giveaway)
      return message.reply(C.v2(C.fail("No ended giveaway found with that message ID.")));

    if (!giveaway.entries.length)
      return message.reply(C.v2(C.fail("No entries in that giveaway — cannot re-roll.")));

    /* Pick new random winners */
    const shuffled = [...giveaway.entries].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, giveaway.winners);
    const winnerMentions = winners.map((id) => `<@${id}>`).join(", ");

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### 🎉  Giveaway Re-rolled!`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `**${giveaway.prize}**\n\n` +
        `${e.dot} **New Winner${winners.length > 1 ? "s" : ""}** · ${winnerMentions}\n` +
        `${e.dot} **Total Entries** · \`${giveaway.entries.length}\``
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Giveaways`));

    await message.reply(C.v2(container));
  },
};
