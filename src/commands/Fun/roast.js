/** @format */

const { chat } = require("../../utils/groq");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "roast",
  aliases: [],
  category: "Fun",
  description: "AI-powered roast of a user",
  usage: "[@user]",
  cooldown: 8,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first() || message.author;

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.brand).addTextDisplayComponents(C.text(`${e.loading} Generating roast...`))
    ));

    const roast = await chat(
      "You are a witty comedian. Generate a short, funny, PG-13 roast (2-3 sentences max). Be creative and playful, never truly mean or offensive. No slurs, no personal attacks. Keep it lighthearted.",
      `Roast a Discord user named "${user.displayName}". Their username is "${user.username}".`
    );

    if (!roast) return loadMsg.edit(C.v2(C.fail("AI is busy. Try again later.")));

    const container = C.container(COLORS.warn)
      .addTextDisplayComponents(C.text(`### 🔥  Roast`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(C.section(
        `**${user.displayName}** got roasted!\n\n*${roast}*`,
        user.displayAvatarURL({ size: 256 })
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Powered by AI · All in good fun`));

    await loadMsg.edit(C.v2(container));
  },
};
