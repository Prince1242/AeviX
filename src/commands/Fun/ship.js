/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "ship",
  aliases: ["love", "match", "lovemeter"],
  category: "Fun",
  description: "Check love compatibility between two users",
  usage: "<@user1> [@user2]",
  args: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user1 = message.mentions.users.first() || message.author;
    const user2 = message.mentions.users.size > 1
      ? message.mentions.users.last()
      : message.mentions.users.first()
        ? message.author
        : null;

    if (!user2) return message.reply(C.v2(C.fail("Mention **one or two users** to ship.")));

    /* Deterministic percentage based on user IDs */
    const ids = [user1.id, user2.id].sort();
    const hash = ids.join("").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const percent = hash % 101;

    /* Heart bar */
    const filled = Math.round(percent / 10);
    const heartBar = "❤️".repeat(filled) + "🖤".repeat(10 - filled);

    let verdict, color;
    if (percent >= 80) { verdict = "Soulmates! 💕"; color = COLORS.error; }
    else if (percent >= 60) { verdict = "Great match! 💖"; color = COLORS.brand; }
    else if (percent >= 40) { verdict = "Maybe... 💛"; color = COLORS.warn; }
    else if (percent >= 20) { verdict = "Just friends 💙"; color = COLORS.info; }
    else { verdict = "Not happening 💔"; color = COLORS.muted; }

    const container = C.container(color)
      .addTextDisplayComponents(C.text(`### 💘  Love Meter`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `**${user1.displayName}** × **${user2.displayName}**\n\n` +
        `${heartBar}\n` +
        `**${percent}%** — ${verdict}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Fun`));

    await message.reply(C.v2(container));
  },
};
