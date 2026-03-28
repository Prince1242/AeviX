/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "nuke",
  aliases: [],
  category: "Moderation",
  description: "Clone and delete the current channel (purges all messages)",
  cooldown: 10,
  userPerms: ["ManageChannels", "ManageGuild"],
  botPerms: ["ManageChannels"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const uid = Date.now().toString(36);

    /* ── Confirm ─────────────────────────────────── */
    const confirm = C.container(COLORS.error)
      .addTextDisplayComponents(C.text(`### ⚠️  Nuke Channel`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `This will **delete** ${message.channel} and create an identical clone.\n` +
        `**All messages will be permanently lost.**\n\n` +
        `Are you sure?`
      ))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.danger(`nuke_yes_${uid}`, "Nuke"),
          C.btn.secondary(`nuke_no_${uid}`, "Cancel"),
        )
      );

    const msg = await message.reply(C.v2(confirm));

    const collector = msg.createMessageComponentCollector({
      time: 15_000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on("collect", async (i) => {
      if (i.customId === `nuke_no_${uid}`) {
        collector.stop("cancelled");
        return i.update(C.v2(C.caution("Nuke cancelled.")));
      }

      if (i.customId === `nuke_yes_${uid}`) {
        collector.stop("confirmed");

        const channel = message.channel;
        const position = channel.position;

        try {
          const clone = await channel.clone({ reason: `Nuked by ${message.author.tag}` });
          await clone.setPosition(position).catch(() => null);
          await channel.delete(`Nuked by ${message.author.tag}`);

          const nuked = C.container(COLORS.success)
            .addTextDisplayComponents(C.text(`### ${MARK}  Channel Nuked`))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(
              `Channel recreated by **${message.author.tag}**.\n` +
              `-# All previous messages have been cleared.`
            ))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(FOOTER));

          await clone.send(C.v2(nuked));
        } catch (err) {
          await i.update(C.v2(C.fail(`Nuke failed: ${err.message}`))).catch(() => null);
        }
      }
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await msg.edit(C.v2(C.caution("Nuke timed out."))).catch(() => null);
      }
    });
  },
};