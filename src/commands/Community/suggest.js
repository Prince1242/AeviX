/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "suggest",
  aliases: ["suggestion", "idea"],
  category: "Community",
  description: "Submit a suggestion for the server",
  usage: "<your suggestion>",
  args: true,
  cooldown: 30,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const suggestion = args.join(" ");

    if (suggestion.length > 1024)
      return message.reply(C.v2(C.fail("Suggestion too long. Keep it under **1024 characters**.")));

    const uid = message.id;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 💡  Suggestion`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(C.section(
        `${suggestion}\n\n` +
        `${e.dot} **By** · ${message.author}\n` +
        `${e.dot} **Status** · Pending`,
        message.author.displayAvatarURL({ size: 256 })
      ))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.success(`suggest_up_${uid}`, "Upvote", "👍"),
          C.btn.secondary(`suggest_count_${uid}`, "0 votes", null, true),
          C.btn.danger(`suggest_down_${uid}`, "Downvote", "👎"),
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Suggestions`));

    await message.delete().catch(() => null);
    const msg = await message.channel.send(C.v2(container));

    /* ── Voting collector ───────────────────────── */
    const upvotes = new Set();
    const downvotes = new Set();

    const collector = msg.createMessageComponentCollector({
      time: 86_400_000, /* 24 hours */
      filter: (i) => i.customId.endsWith(uid),
    });

    collector.on("collect", async (i) => {
      const action = i.customId.includes("up") ? "up" : "down";

      if (action === "up") {
        downvotes.delete(i.user.id);
        if (upvotes.has(i.user.id)) { upvotes.delete(i.user.id); }
        else { upvotes.add(i.user.id); }
      } else {
        upvotes.delete(i.user.id);
        if (downvotes.has(i.user.id)) { downvotes.delete(i.user.id); }
        else { downvotes.add(i.user.id); }
      }

      const net = upvotes.size - downvotes.size;

      const updated = C.container(net > 0 ? COLORS.success : net < 0 ? COLORS.error : COLORS.brand)
        .addTextDisplayComponents(C.text(`### 💡  Suggestion`))
        .addSeparatorComponents(C.separator())
        .addSectionComponents(C.section(
          `${suggestion}\n\n` +
          `${e.dot} **By** · ${message.author}\n` +
          `${e.dot} **Status** · Pending`,
          message.author.displayAvatarURL({ size: 256 })
        ))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(
            C.btn.success(`suggest_up_${uid}`, `${upvotes.size}`, "👍"),
            C.btn.secondary(`suggest_count_${uid}`, `${net >= 0 ? "+" : ""}${net}`, null, true),
            C.btn.danger(`suggest_down_${uid}`, `${downvotes.size}`, "👎"),
          )
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Suggestions`));

      await i.update(C.v2(updated));
    });
  },
};
