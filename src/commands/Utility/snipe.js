/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

const MAX_AGE_MS = 10 * 60 * 1000;

module.exports = {
  name: "snipe",
  aliases: ["s"],
  category: "Utility",
  description: "View the last deleted message in this channel",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const data = client.snipes?.get(message.channel.id);

    if (!data)
      return message.reply(C.v2(C.fail("Nothing to snipe in this channel.")));

    if (Date.now() - data.time > MAX_AGE_MS) {
      client.snipes.delete(message.channel.id);
      return message.reply(C.v2(C.fail("Last deleted message **expired** (>10 min).")));
    }

    const deletedTs = Math.round(data.time / 1000);
    const content = data.content || "*No text content*";
    const author = data.author;

    const body = [
      `**${author.displayName}** (\`@${author.username}\`)`,
      "",
      content.length > 1500 ? content.substring(0, 1500) + "..." : content,
      "",
      `-# Deleted <t:${deletedTs}:R>`,
    ].join("\n");

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Sniped Message`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(C.section(body, author.displayAvatarURL({ size: 128 })));

    if (data.image) {
      container.addSeparatorComponents(C.separator())
        .addMediaGalleryComponents(C.gallery(data.image));
    }

    container.addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};