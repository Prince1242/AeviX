/** @format */

const { chat } = require("../../utils/groq");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "compliment",
  aliases: ["comp"],
  category: "Fun",
  description: "AI-powered compliment for a user",
  usage: "[@user]",
  cooldown: 8,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first() || message.author;

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.brand).addTextDisplayComponents(C.text(`${e.loading} Generating compliment...`))
    ));

    const compliment = await chat(
      "You are a kind, wholesome hype-person. Generate a short, genuine, uplifting compliment (2-3 sentences max). Be creative, specific, and heartwarming.",
      `Compliment a Discord user named "${user.displayName}". Their username is "${user.username}".`
    );

    if (!compliment) return loadMsg.edit(C.v2(C.fail("AI is busy. Try again later.")));

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### 💖  Compliment`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(C.section(
        `**${user.displayName}** deserves this!\n\n*${compliment}*`,
        user.displayAvatarURL({ size: 256 })
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Powered by AI · Spread the love`));

    await loadMsg.edit(C.v2(container));
  },
};
