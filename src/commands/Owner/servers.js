/** @format */

const Components = require("../../custom/components");
const { paginate } = require("../../utils/paginator");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "servers",
  aliases: ["guilds", "serverlist"],
  category: "Owner",
  description: "List all servers the bot is in",
  owner: true,
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const e = client.emoji;
    const guilds = client.guilds.cache
      .sort((a, b) => b.memberCount - a.memberCount)
      .map((g, i) => g);

    const totalUsers = guilds.reduce((a, g) => a + g.memberCount, 0);

    const items = guilds.map((g, i) => {
      return (
        `\`${i + 1}.\` **${g.name}**\n` +
        `${e.dot} \`${g.id}\` · \`${g.memberCount}\` members`
      );
    });

    await paginate(message, client, {
      items,
      perPage: 10,
      title: `${MARK}  Servers — ${guilds.length} (${client.numb(totalUsers)} users)`,
      color: COLORS.brand,
      footer: FOOTER,
      userId: message.author.id,
    });
  },
};