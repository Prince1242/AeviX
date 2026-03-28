/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /giveaway
 *  Full giveaway system: start, end, reroll, list, delete.
 *  Entry handling is in interactionCreate.js (giveaway_enter_ buttons).
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Giveaway = require("../../schema/giveaway");
const { parseDuration, formatTimeLeft, pickWinners, buildWeightedEntries, endGiveaway } = require("../../utils/giveaway");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "giveaway",
  description: "Manage server giveaways",
  userPerms: ["ManageGuild"],
  default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
  options: [
    {
      name: "start",
      description: "Start a new giveaway",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "prize",
          description: "What you're giving away",
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 200,
        },
        {
          name: "duration",
          description: "How long the giveaway lasts (e.g. 10m, 1h, 2d, 1w)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "winners",
          description: "Number of winners (default: 1)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 20,
        },
        {
          name: "channel",
          description: "Channel to host giveaway in (default: current)",
          type: ApplicationCommandOptionType.Channel,
          required: false,
        },
        {
          name: "required_role",
          description: "Role required to enter",
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
      ],
    },
    {
      name: "end",
      description: "End a giveaway early",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "message_id",
          description: "Message ID of the giveaway",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "reroll",
      description: "Reroll winners of an ended giveaway",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "message_id",
          description: "Message ID of the ended giveaway",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "winners",
          description: "Number of new winners (default: original count)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 20,
        },
      ],
    },
    {
      name: "list",
      description: "List active giveaways in this server",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "delete",
      description: "Delete a giveaway completely",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "message_id",
          description: "Message ID of the giveaway to delete",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    /* ═══════════════════════════════════════════════
     *  START
     * ═══════════════════════════════════════════════ */
    if (sub === "start") {
      const prize = interaction.options.getString("prize");
      const durationStr = interaction.options.getString("duration");
      const winnerCount = interaction.options.getInteger("winners") || 1;
      const channel = interaction.options.getChannel("channel") || interaction.channel;
      const requiredRole = interaction.options.getRole("required_role");

      /* ── Parse duration ────────────────────────── */
      const ms = parseDuration(durationStr);
      if (!ms || ms < 10_000)
        return interaction.reply(C.v2(C.fail("Invalid duration. Minimum is `10s`. Use formats like `10m`, `1h`, `2d`.")));
      if (ms > 30 * 24 * 60 * 60 * 1000)
        return interaction.reply(C.v2(C.fail("Giveaway duration cannot exceed **30 days**.")));

      await interaction.deferReply();

      const endsAt = new Date(Date.now() + ms);
      const endsTs = Math.round(endsAt.getTime() / 1000);

      /* ── Build giveaway message ────────────────── */
      const body = [
        `**${prize}**\n`,
        `${e.dot} **Ends** · <t:${endsTs}:R> (<t:${endsTs}:f>)`,
        `${e.dot} **Winners** · \`${winnerCount}\``,
        `${e.dot} **Hosted by** · ${interaction.user}`,
        `${e.dot} **Entries** · \`0\``,
      ];
      if (requiredRole)
        body.push(`${e.dot} **Required Role** · ${requiredRole}`);
      body.push(`\n-# Click the button below to enter!`);

      /* Use a temporary button ID — will be updated after message is sent */
      const tempBtnId = `giveaway_enter_pending`;

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### 🎉  Giveaway`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(body.join("\n")))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(
            C.btn.success(tempBtnId, "Enter Giveaway", "🎉"),
            C.btn.secondary("giveaway_entries_pending", `0 entries`, null, true)
          )
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Giveaways`));

      let giveawayMsg;
      try {
        giveawayMsg = await channel.send(C.v2(container));
      } catch (err) {
        return interaction.editReply(C.v2(
          C.fail(`Failed to send giveaway: ${err.message}`)
        ));
      }

      /* ── Save to DB ────────────────────────────── */
      await Giveaway.create({
        guildId,
        channelId: channel.id,
        messageId: giveawayMsg.id,
        hostId: interaction.user.id,
        prize,
        winners: winnerCount,
        endsAt,
        requiredRole: requiredRole?.id || null,
      });

      /* ── Update button with real message ID ────── */
      try {
        const updated = C.container(COLORS.brand)
          .addTextDisplayComponents(C.text(`### 🎉  Giveaway`))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(body.join("\n")))
          .addSeparatorComponents(C.separator())
          .addActionRowComponents(
            C.row(
              C.btn.success(`giveaway_enter_${giveawayMsg.id}`, "Enter Giveaway", "🎉"),
              C.btn.secondary(`giveaway_entries_${giveawayMsg.id}`, `0 entries`, null, true)
            )
          )
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Giveaways`));

        await giveawayMsg.edit(C.v2(updated));
      } catch {}

      /* ── Confirm to host ───────────────────────── */
      const confirm = C.container(COLORS.success)
        .addTextDisplayComponents(C.text(`### ${MARK}  Giveaway Started`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Prize** · ${prize}\n` +
          `${e.dot} **Channel** · ${channel}\n` +
          `${e.dot} **Duration** · ${formatTimeLeft(ms)}\n` +
          `${e.dot} **Winners** · \`${winnerCount}\`\n` +
          `${e.dot} **Ends** · <t:${endsTs}:R>` +
          (requiredRole ? `\n${e.dot} **Required Role** · ${requiredRole}` : "")
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      await interaction.editReply(C.v2(confirm));
    }

    /* ═══════════════════════════════════════════════
     *  END
     * ═══════════════════════════════════════════════ */
    if (sub === "end") {
      const messageId = interaction.options.getString("message_id").trim();

      const giveaway = await Giveaway.findOne({ guildId, messageId, ended: false });
      if (!giveaway)
        return interaction.reply(C.v2(C.fail("No **active** giveaway found with that message ID.")));

      await interaction.deferReply();

      try {
        const winners = await endGiveaway(client, giveaway);
        const winnersText = winners.length
          ? winners.map((id) => `<@${id}>`).join(", ")
          : "No valid entries";

        return interaction.editReply(C.v2(
          C.ok(`Giveaway for **${giveaway.prize}** ended.\n${e.dot} **Winner(s):** ${winnersText}`)
        ));
      } catch (err) {
        return interaction.editReply(C.v2(
          C.fail(`Failed to end giveaway: ${err.message}`)
        ));
      }
    }

    /* ═══════════════════════════════════════════════
     *  REROLL
     * ═══════════════════════════════════════════════ */
    if (sub === "reroll") {
      const messageId = interaction.options.getString("message_id").trim();
      const newCount = interaction.options.getInteger("winners");

      const giveaway = await Giveaway.findOne({ guildId, messageId, ended: true });
      if (!giveaway)
        return interaction.reply(C.v2(C.fail("No **ended** giveaway found with that message ID.")));
      if (!giveaway.entries.length)
        return interaction.reply(C.v2(C.fail("That giveaway had **no entries** to reroll.")));

      await interaction.deferReply();

      const count = newCount || giveaway.winners;
      const guild = client.guilds.cache.get(guildId);
      const weighted = buildWeightedEntries(giveaway, guild);
      const winnerIds = pickWinners(weighted, count);

      /* Update DB */
      giveaway.winnerIds = [...new Set(winnerIds)];
      await giveaway.save();

      const winnersText = winnerIds.length
        ? winnerIds.map((id) => `<@${id}>`).join(", ")
        : "No valid entries";

      /* Announce in channel */
      const channel = guild.channels.cache.get(giveaway.channelId);
      if (channel) {
        await channel.send(
          `🎉 **Reroll** — New winner(s) for **${giveaway.prize}**: ${winnersText}`
        ).catch(() => null);
      }

      const container = C.container(COLORS.success)
        .addTextDisplayComponents(C.text(`### ${MARK}  Giveaway Rerolled`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Prize** · ${giveaway.prize}\n` +
          `${e.dot} **New Winner(s)** · ${winnersText}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      await interaction.editReply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  LIST
     * ═══════════════════════════════════════════════ */
    if (sub === "list") {
      const active = await Giveaway.find({ guildId, ended: false }).sort({ endsAt: 1 });

      if (!active.length) {
        return interaction.reply(C.v2(
          C.container(COLORS.brand)
            .addTextDisplayComponents(C.text(`### 🎉  Active Giveaways`))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(
              `No active giveaways in this server.\nUse \`/giveaway start\` to create one.`
            ))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(FOOTER))
        ));
      }

      const lines = active.map((g, i) => {
        const endsTs = Math.round(g.endsAt.getTime() / 1000);
        const link = `https://discord.com/channels/${guildId}/${g.channelId}/${g.messageId}`;
        return (
          `**${i + 1}.** [${g.prize}](${link})\n` +
          `${e.dot} Ends <t:${endsTs}:R> · \`${g.entries.length}\` entries · \`${g.winners}\` winner(s)\n` +
          `${e.dot} Hosted by <@${g.hostId}> · ID: \`${g.messageId}\``
        );
      });

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### 🎉  Active Giveaways — ${active.length}`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(lines.join("\n\n")))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      await interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  DELETE
     * ═══════════════════════════════════════════════ */
    if (sub === "delete") {
      const messageId = interaction.options.getString("message_id").trim();

      const giveaway = await Giveaway.findOne({ guildId, messageId });
      if (!giveaway)
        return interaction.reply(C.v2(C.fail("No giveaway found with that message ID.")));

      await interaction.deferReply();

      /* Try to delete the message */
      try {
        const channel = interaction.guild.channels.cache.get(giveaway.channelId);
        if (channel) {
          const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
          if (msg?.deletable) await msg.delete().catch(() => null);
        }
      } catch {}

      await Giveaway.deleteOne({ _id: giveaway._id });

      await interaction.editReply(C.v2(
        C.ok(`Giveaway for **${giveaway.prize}** has been **deleted**.`)
      ));
    }
  },
};