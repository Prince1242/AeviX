/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "embed",
  aliases: ["createembed", "ce"],
  category: "Community",
  description: "Create a custom embed message interactively",
  usage: "<title> | <description> [| color hex] [| image url]",
  args: true,
  cooldown: 5,
  userPerms: ["ManageMessages"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const parts = args.join(" ").split("|").map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2)
      return message.reply(C.v2(C.fail(`Format: \`${prefix}embed Title | Description [| #color] [| image url]\``)));

    const title = parts[0];
    const description = parts[1];
    const colorInput = parts[2]?.replace("#", "");
    const imageUrl = parts[3];

    /* Parse color */
    let color = COLORS.brand;
    if (colorInput && /^[0-9a-fA-F]{6}$/.test(colorInput)) {
      color = parseInt(colorInput, 16);
    }

    const container = C.container(color)
      .addTextDisplayComponents(C.text(`### ${title}`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(description));

    if (imageUrl && imageUrl.startsWith("http")) {
      container
        .addSeparatorComponents(C.separator())
        .addMediaGalleryComponents(C.gallery(imageUrl));
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Custom Embed`));

    await message.delete().catch(() => null);
    await message.channel.send(C.v2(container));
  },
};
