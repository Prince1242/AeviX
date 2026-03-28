/** @format */

const { chat } = require("../../utils/groq");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "code",
  aliases: ["codegen", "snippet"],
  category: "AI",
  description: "Generate or explain code",
  usage: "<language> <description>",
  args: true,
  cooldown: 8,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const input = args.join(" ");

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.brand).addTextDisplayComponents(C.text(`${e.loading} Generating code...`))
    ));

    const response = await chat(
      "You are an expert programmer. Generate clean, well-commented code based on the user's request. If they ask to explain code, provide a clear explanation. Always wrap code in markdown code blocks with the language specified. Keep responses under 1800 characters for Discord. Be concise.",
      input,
      { maxTokens: 1000, temperature: 0.4 }
    );

    if (!response)
      return loadMsg.edit(C.v2(C.fail("AI is currently busy. Please try again.")));

    const truncated = response.length > 1800 ? response.slice(0, 1800) + "\n```\n…" : response;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 💻  Code`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(truncated))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Powered by Groq AI`));

    await loadMsg.edit(C.v2(container));
  },
};
