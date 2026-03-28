/** @format */

const { PermissionsBitField } = require("discord.js");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "steal",
  aliases: ["addemoji", "yoink"],
  category: "Community",
  description: "Steal an emoji or sticker and add it to this server",
  usage: "<emoji or image URL> [name]",
  args: true,
  cooldown: 5,
  userPerms: ["ManageGuildExpressions"],
  botPerms: ["ManageGuildExpressions"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    /* ── Parse emoji ─────────────────────────────── */
    const emojiRegex = /<(a?):(\w+):(\d+)>/;
    const match = args[0].match(emojiRegex);

    let url, name;

    if (match) {
      const animated = match[1] === "a";
      const emojiId = match[3];
      name = args[1] || match[2];
      url = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? "gif" : "png"}?size=128`;
    } else if (args[0].startsWith("http")) {
      url = args[0];
      name = args[1] || "stolen_emoji";
    } else {
      return message.reply(C.v2(C.fail("Provide a **custom emoji** or **image URL**.")));
    }

    /* Sanitize name */
    name = name.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);
    if (name.length < 2) name = "stolen_emoji";

    try {
      const emoji = await message.guild.emojis.create({ attachment: url, name });

      const container = C.container(COLORS.success)
        .addTextDisplayComponents(C.text(`### ${MARK}  Emoji Added`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.tick} Successfully added ${emoji}\n\n` +
          `${e.dot} **Name** · \`:${emoji.name}:\`\n` +
          `${e.dot} **ID** · \`${emoji.id}\`\n` +
          `${e.dot} **Animated** · ${emoji.animated ? "Yes" : "No"}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Community`));

      await message.reply(C.v2(container));
    } catch (err) {
      const errMsg = err.message.includes("Maximum")
        ? "Server has reached the **emoji limit**."
        : `Failed: ${err.message}`;
      await message.reply(C.v2(C.fail(errMsg)));
    }
  },
};
