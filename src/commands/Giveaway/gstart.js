/** @format */

const Giveaway = require("../../schema/giveaway");
const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "gstart",
  aliases: ["gcreate", "giveawaystart"],
  category: "Giveaway",
  description: "Start a giveaway",
  usage: "<duration> <winners> <prize>",
  args: true,
  cooldown: 10,
  userPerms: ["ManageGuild"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    if (args.length < 3)
      return message.reply(C.v2(C.fail(`Format: \`${prefix}gstart <duration> <winners> <prize>\`\nExample: \`${prefix}gstart 1h 1 Discord Nitro\``)));

    /* Parse duration */
    const durationStr = args[0].toLowerCase();
    const durationMatch = durationStr.match(/^(\d+)(s|m|h|d)$/);
    if (!durationMatch) return message.reply(C.v2(C.fail("Duration format: `10s`, `5m`, `1h`, `7d`")));

    const amount = parseInt(durationMatch[1]);
    const unit = durationMatch[2];
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const durationMs = amount * multipliers[unit];

    if (durationMs < 10000 || durationMs > 30 * 86400000)
      return message.reply(C.v2(C.fail("Duration must be between **10 seconds** and **30 days**.")));

    /* Parse winners */
    const winners = parseInt(args[1]);
    if (isNaN(winners) || winners < 1 || winners > 20)
      return message.reply(C.v2(C.fail("Winners must be between **1** and **20**.")));

    /* Prize */
    const prize = args.slice(2).join(" ");
    if (prize.length > 200)
      return message.reply(C.v2(C.fail("Prize name must be under **200 characters**.")));

    const endsAt = new Date(Date.now() + durationMs);
    const endsTs = Math.round(endsAt.getTime() / 1000);

    /* Build giveaway message */
    const body = [
      `**${prize}**\n`,
      `${e.dot} **Ends** · <t:${endsTs}:R> (<t:${endsTs}:f>)`,
      `${e.dot} **Winners** · \`${winners}\``,
      `${e.dot} **Hosted by** · ${message.author}`,
      `${e.dot} **Entries** · \`0\``,
      `\n-# Click the button below to enter!`,
    ];

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 🎉  Giveaway`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(body.join("\n")))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.success("giveaway_enter_pending", "Enter Giveaway", "🎉"),
          C.btn.secondary("giveaway_entries_pending", "0 entries", null, true)
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Giveaways`));

    const msg = await message.channel.send(C.v2(container));

    /* Save to DB */
    const giveaway = new Giveaway({
      guildId: message.guildId,
      channelId: message.channel.id,
      messageId: msg.id,
      hostId: message.author.id,
      prize,
      winners,
      endsAt,
      entries: [],
      ended: false,
    });
    await giveaway.save();

    /* Update button IDs with real message ID */
    const updatedContainer = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 🎉  Giveaway`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(body.join("\n")))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.success(`giveaway_enter_${msg.id}`, "Enter Giveaway", "🎉"),
          C.btn.secondary(`giveaway_entries_${msg.id}`, "0 entries", null, true)
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Giveaways`));

    await msg.edit(C.v2(updatedContainer));
    await message.delete().catch(() => null);

    await message.channel.send(C.v2(C.ok(`Giveaway for **${prize}** started! Ending <t:${endsTs}:R>.`)))
      .then((m) => setTimeout(() => m.delete().catch(() => null), 8000));
  },
};
