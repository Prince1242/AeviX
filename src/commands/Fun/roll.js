/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "roll",
  aliases: ["dice", "d"],
  category: "Fun",
  description: "Roll dice (e.g. 2d6, d20, 1d100)",
  usage: "[NdN] (default: 1d6)",
  cooldown: 2,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const input = args[0] || "1d6";

    const match = input.match(/^(\d+)?d(\d+)$/i);
    if (!match) return message.reply(C.v2(C.fail("Format: `NdN` (e.g. `2d6`, `d20`, `1d100`)")));

    const count = Math.min(parseInt(match[1] || "1"), 20);
    const sides = Math.min(parseInt(match[2]), 1000);
    if (count < 1 || sides < 2) return message.reply(C.v2(C.fail("Need at least 1 die with 2+ sides.")));

    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);

    const rollDisplay = count <= 10
      ? rolls.map((r) => `\`${r}\``).join(" + ")
      : rolls.slice(0, 10).map((r) => `\`${r}\``).join(" + ") + ` ... (+${count - 10} more)`;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 🎲  Dice Roll — ${count}d${sides}`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${rollDisplay}\n\n` +
        `${e.dot} **Total** · **${total}**${count > 1 ? `\n${e.dot} **Average** · ${(total / count).toFixed(1)}` : ""}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Fun`));

    await message.reply(C.v2(container));
  },
};
