/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

const CHOICES = ["rock", "paper", "scissors"];
const EMOJIS = { rock: "🪨", paper: "📄", scissors: "✂️" };
const WINS = { rock: "scissors", paper: "rock", scissors: "paper" };

module.exports = {
  name: "rps",
  aliases: ["rockpaperscissors"],
  category: "Fun",
  description: "Play Rock Paper Scissors",
  usage: "[rock|paper|scissors]",
  cooldown: 2,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const uid = message.id;

    /* ── With argument — instant play ────────────── */
    if (args.length) {
      const userChoice = args[0].toLowerCase();
      if (!CHOICES.includes(userChoice))
        return message.reply(C.v2(C.fail("Choose `rock`, `paper`, or `scissors`.")));

      return playRound(message, C, e, userChoice);
    }

    /* ── No argument — button UI ─────────────────── */
    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ✂️  Rock Paper Scissors\n\nChoose your move!`))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.secondary(`rps_rock_${uid}`, "Rock", "🪨"),
          C.btn.secondary(`rps_paper_${uid}`, "Paper", "📄"),
          C.btn.secondary(`rps_scissors_${uid}`, "Scissors", "✂️"),
        )
      );

    const msg = await message.reply(C.v2(container));

    const collector = msg.createMessageComponentCollector({
      time: 30_000,
      filter: (i) => i.user.id === message.author.id && i.customId.endsWith(uid),
    });

    collector.on("collect", async (i) => {
      const choice = i.customId.replace(`_${uid}`, "").replace("rps_", "");
      await playRound(i, C, e, choice, true);
      collector.stop();
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "time" && collected.size === 0) {
        await msg.edit(C.v2(
          C.container(COLORS.muted)
            .addTextDisplayComponents(C.text(`### ✂️  Rock Paper Scissors\n\n-# Game timed out`))
        )).catch(() => null);
      }
    });
  },
};

function playRound(target, C, e, userChoice, isInteraction = false) {
  const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];

  let result, color;
  if (userChoice === botChoice) {
    result = "It's a **tie**! 🤝";
    color = COLORS.warn;
  } else if (WINS[userChoice] === botChoice) {
    result = "You **win**! 🎉";
    color = COLORS.success;
  } else {
    result = "You **lose**! 😔";
    color = COLORS.error;
  }

  const container = C.container(color)
    .addTextDisplayComponents(C.text(`### ✂️  Rock Paper Scissors`))
    .addSeparatorComponents(C.separator())
    .addTextDisplayComponents(C.text(
      `${e.dot} **You** · ${EMOJIS[userChoice]} ${userChoice}\n` +
      `${e.dot} **Bot** · ${EMOJIS[botChoice]} ${botChoice}\n\n` +
      `${result}`
    ))
    .addSeparatorComponents(C.separator())
    .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Fun`));

  return isInteraction
    ? target.update(C.v2(container))
    : target.reply(C.v2(container));
}
