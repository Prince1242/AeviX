/** @format */

const { chat } = require("../../utils/groq");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "summarize",
  aliases: ["tldr", "summary"],
  category: "AI",
  description: "Summarize long text into key points",
  usage: "<text to summarize>",
  args: true,
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const text = args.join(" ");

    if (text.length < 50)
      return message.reply(C.v2(C.fail("Text is too short to summarize. Provide at least **50 characters**.")));

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.brand).addTextDisplayComponents(C.text(`${e.loading} Summarizing...`))
    ));

    const response = await chat(
      "You are a concise summarizer. Extract key points from the given text. Use bullet points (•). Be brief and factual. Max 5 bullet points. Keep under 800 characters total.",
      `Summarize this:\n\n${text.slice(0, 3000)}`,
      { maxTokens: 400, temperature: 0.3 }
    );

    if (!response)
      return loadMsg.edit(C.v2(C.fail("AI is currently busy. Please try again.")));

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 📝  Summary`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(response))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Powered by Groq AI · Original: ${text.length} chars`));

    await loadMsg.edit(C.v2(container));
  },
};
