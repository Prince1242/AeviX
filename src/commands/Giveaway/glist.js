/** @format */

const Giveaway = require("../../schema/giveaway");
const { paginate } = require("../../utils/paginator");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "glist",
  aliases: ["giveawaylist", "giveaways"],
  category: "Giveaway",
  description: "List active giveaways in this server",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const giveaways = await Giveaway.find({
      guildId: message.guildId,
      ended: false,
    }).sort({ endsAt: 1 });

    if (!giveaways.length)
      return message.reply(C.v2(C.caution("No active giveaways in this server.")));

    const items = giveaways.map((g, i) => {
      const endsTs = Math.round(g.endsAt.getTime() / 1000);
      return (
        `\`${i + 1}.\` **${g.prize}**\n` +
        `${e.dot} Ends <t:${endsTs}:R> · \`${g.entries.length}\` entries · \`${g.winners}\` winner${g.winners > 1 ? "s" : ""}\n` +
        `${e.dot} Channel: <#${g.channelId}> · [Jump](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId})`
      );
    });

    await paginate(message, client, {
      items,
      perPage: 5,
      title: `${MARK}  Active Giveaways — ${giveaways.length}`,
      color: COLORS.brand,
      footer: `-# ${MARK} Use \`${prefix}gend <message ID>\` to end early`,
      userId: message.author.id,
    });
  },
};
