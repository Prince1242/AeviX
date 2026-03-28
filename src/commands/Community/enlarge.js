/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "enlarge",
  aliases: ["big", "jumbo", "bigemoji"],
  category: "Community",
  description: "Enlarge a custom emoji to full size",
  usage: "<emoji>",
  args: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const emojiRegex = /<(a?):(\w+):(\d+)>/;
    const match = args[0].match(emojiRegex);

    if (!match)
      return message.reply(C.v2(C.fail("Provide a **custom emoji** to enlarge.")));

    const animated = match[1] === "a";
    const emojiName = match[2];
    const emojiId = match[3];
    const url = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? "gif" : "png"}?size=512`;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  ${emojiName}`))
      .addSeparatorComponents(C.separator())
      .addMediaGalleryComponents(C.gallery(url))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(C.btn.link("Open Full Size", url))
      );

    await message.reply(C.v2(container));
  },
};
