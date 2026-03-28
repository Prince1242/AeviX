/** @format */

const { chat } = require("../../utils/groq");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "ask",
  aliases: ["ai", "chat", "gpt"],
  category: "AI",
  description: "Ask AI anything — powered by Groq",
  usage: "<question>",
  args: true,
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const question = args.join(" ");

    if (question.length > 1500)
      return message.reply(C.v2(C.fail("Question too long. Keep it under **1500 characters**.")));

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.brand).addTextDisplayComponents(C.text(`${e.loading} Thinking...`))
    ));

    const response = await chat(
      "You are Aevix, a helpful AI assistant inside a Discord bot. Be concise, informative, and friendly. Use markdown formatting. Keep responses under 1800 characters for Discord. If asked about yourself, you're made by Prince.",
      question,
      { maxTokens: 800, temperature: 0.7 }
    );

    if (!response)
      return loadMsg.edit(C.v2(C.fail("AI is currently busy. Please try again in a moment.")));

    const truncated = response.length > 1800 ? response.slice(0, 1800) + "…" : response;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 🤖  AI Response`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(truncated))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Powered by Groq AI · Asked by ${message.author.displayName}`));

    await loadMsg.edit(C.v2(container));
  },
};
