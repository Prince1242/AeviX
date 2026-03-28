/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "coinflip",
  aliases: ["flip", "coin", "cf"],
  category: "Fun",
  description: "Flip a coin — heads or tails",
  cooldown: 2,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const isHeads = Math.random() < 0.5;

    const container = C.container(isHeads ? COLORS.brand : COLORS.success)
      .addTextDisplayComponents(C.text(
        `### 🪙  Coin Flip\n\n` +
        `The coin landed on **${isHeads ? "Heads" : "Tails"}**! ${isHeads ? "👑" : "🌿"}`
      ));

    await message.reply(C.v2(container));
  },
};
