/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

const RESPONSES = [
  "It is certain.", "It is decidedly so.", "Without a doubt.",
  "Yes — definitely.", "You may rely on it.", "As I see it, yes.",
  "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
  "Reply hazy, try again.", "Ask again later.", "Better not tell you now.",
  "Cannot predict now.", "Concentrate and ask again.",
  "Don't count on it.", "My reply is no.", "My sources say no.",
  "Outlook not so good.", "Very doubtful.",
];

module.exports = {
  name: "8ball",
  aliases: ["eightball", "magic", "fortune"],
  category: "Fun",
  description: "Ask the magic 8-ball a question",
  usage: "<question>",
  args: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const question = args.join(" ");
    const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

    const isPositive = RESPONSES.indexOf(answer) < 10;
    const isNeutral = RESPONSES.indexOf(answer) >= 10 && RESPONSES.indexOf(answer) < 15;
    const color = isPositive ? COLORS.success : isNeutral ? COLORS.warn : COLORS.error;

    const container = C.container(color)
      .addTextDisplayComponents(C.text(`### 🎱  Magic 8-Ball`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Question** · ${question}\n\n` +
        `${e.dot} **Answer** · *${answer}*`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Fun`));

    await message.reply(C.v2(container));
  },
};
