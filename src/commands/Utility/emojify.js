/** @format */

const Components = require("../../custom/components");

module.exports = {
  name: "emojify",
  aliases: ["emoji"],
  category: "Utility",
  description: "Convert text to regional indicator emojis",
  usage: "<text>",
  args: true,
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const input = args.join(" ");

    if (input.length > 200) {
      return message.reply(C.v2(C.fail("Text must be **200 characters** or fewer.")));
    }

    const result = client.util.emojify(input);

    if (!result.trim()) {
      return message.reply(C.v2(C.fail("Couldn't convert that text. Use **letters and spaces** only.")));
    }

    /* Send as plain text (emojis need to render inline, not in V2 container) */
    await message.channel.send(result).catch(() => {
      message.reply(C.v2(C.fail("Failed to send emojified text.")));
    });
  },
};