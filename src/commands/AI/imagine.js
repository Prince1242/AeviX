/** @format */

const { chat } = require("../../utils/groq");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "imagine",
  aliases: ["generate", "describe"],
  category: "AI",
  description: "AI generates a vivid image description from your prompt",
  usage: "<concept or scene>",
  args: true,
  cooldown: 8,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const prompt = args.join(" ");

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.brand).addTextDisplayComponents(C.text(`${e.loading} Imagining **${prompt.slice(0, 60)}**...`))
    ));

    const response = await chat(
      "You are an expert visual artist and creative writer. Given a concept, generate a vivid, detailed description of what an image would look like. Include colors, composition, mood, lighting, style (photorealistic, anime, painting, etc.), and specific visual details. Format it beautifully with sections. Keep under 1500 characters.",
      `Describe an image of: ${prompt}`,
      { maxTokens: 600, temperature: 0.9 }
    );

    if (!response)
      return loadMsg.edit(C.v2(C.fail("AI is currently busy. Please try again.")));

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 🎨  Imagination`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `**Prompt:** *${prompt}*\n\n${response}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Powered by Groq AI`));

    await loadMsg.edit(C.v2(container));
  },
};
