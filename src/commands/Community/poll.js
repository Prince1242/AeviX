/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "poll",
  aliases: ["survey"],
  category: "Community",
  description: "Create a poll with up to 5 options",
  usage: "<question> | <option1> | <option2> [| option3...]",
  args: true,
  cooldown: 10,
  userPerms: ["SendMessages"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const uid = message.id;

    const parts = args.join(" ").split("|").map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3)
      return message.reply(C.v2(C.fail(`Format: \`${prefix}poll Question | Option1 | Option2 [| Option3...]\``)));

    const question = parts[0];
    const options = parts.slice(1, 6); /* Max 5 options */

    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
    const votes = new Map();
    options.forEach((_, i) => votes.set(i, new Set()));

    function buildPoll(disabled = false) {
      const totalVotes = [...votes.values()].reduce((a, s) => a + s.size, 0);

      const optionLines = options.map((opt, i) => {
        const count = votes.get(i).size;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const barLen = totalVotes > 0 ? Math.round((count / totalVotes) * 12) : 0;
        const bar = "█".repeat(barLen) + "░".repeat(12 - barLen);
        return `${numberEmojis[i]} **${opt}**\n\`${bar}\` ${pct}% (${count})`;
      }).join("\n\n");

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### 📊  Poll`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`**${question}**\n\n${optionLines}`))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(
            ...options.map((opt, i) =>
              C.btn.secondary(`poll_${i}_${uid}`, opt.slice(0, 25), numberEmojis[i], disabled)
            )
          )
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} ${totalVotes} vote${totalVotes !== 1 ? "s" : ""} · Poll by ${message.author.displayName}`));

      return C.v2(container);
    }

    const msg = await message.reply(buildPoll());

    const collector = msg.createMessageComponentCollector({
      time: 300_000, /* 5 minutes */
      filter: (i) => i.customId.endsWith(uid),
    });

    collector.on("collect", async (i) => {
      const optionIdx = parseInt(i.customId.split("_")[1]);

      /* Remove previous vote */
      for (const [, voters] of votes) voters.delete(i.user.id);

      /* Add new vote */
      votes.get(optionIdx).add(i.user.id);

      await i.update(buildPoll());
    });

    collector.on("end", async () => {
      await msg.edit(buildPoll(true)).catch(() => null);
    });
  },
};
