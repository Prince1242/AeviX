/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /purge
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits, MessageFlags } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "purge",
  description: "Bulk delete messages from this channel",
  botPerms: ["ManageMessages", "ReadMessageHistory"],
  userPerms: ["ManageMessages"],
  default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
  options: [
    {
      name: "amount",
      description: "Number of messages to delete (1-100)",
      type: ApplicationCommandOptionType.Integer,
      required: true,
      min_value: 1,
      max_value: 100,
    },
    {
      name: "user",
      description: "Only delete messages from this user",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
    {
      name: "filter",
      description: "Filter messages by type",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "Bots only", value: "bots" },
        { name: "Humans only", value: "humans" },
        { name: "Links only", value: "links" },
        { name: "Attachments only", value: "attachments" },
      ],
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const amount = interaction.options.getInteger("amount");
    const targetUser = interaction.options.getUser("user");
    const filter = interaction.options.getString("filter");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    /* ── Fetch messages ──────────────────────────── */
    let messages;
    try {
      messages = await interaction.channel.messages.fetch({ limit: amount });
    } catch {
      return interaction.editReply(C.v2(C.fail("Failed to fetch messages.")));
    }

    /* ── Apply filters ───────────────────────────── */
    const FILTERS = {
      bots:        (m) => m.author.bot,
      humans:      (m) => !m.author.bot,
      links:       (m) => /https?:\/\/|discord\.gg\//i.test(m.content),
      attachments: (m) => m.attachments.size > 0,
    };

    let filtered = messages.filter((m) => m.deletable);

    if (targetUser) filtered = filtered.filter((m) => m.author.id === targetUser.id);
    if (filter && FILTERS[filter]) filtered = filtered.filter(FILTERS[filter]);

    if (filtered.size === 0)
      return interaction.editReply(C.v2(C.fail("No deletable messages matched your criteria.")));

    /* ── Bulk delete ─────────────────────────────── */
    let deleted;
    try {
      deleted = await interaction.channel.bulkDelete(filtered, true);
    } catch (err) {
      return interaction.editReply(C.v2(C.fail(`Failed to delete: ${err.message}`)));
    }

    const details = [
      `${e.dot} **Deleted** · \`${deleted.size}\` message(s)`,
      `${e.dot} **Channel** · ${interaction.channel}`,
    ];
    if (targetUser) details.push(`${e.dot} **User Filter** · ${targetUser.tag}`);
    if (filter) details.push(`${e.dot} **Type Filter** · ${filter}`);
    details.push(`${e.dot} **Moderator** · ${interaction.user.displayName}`);

    if (deleted.size < filtered.size) {
      details.push(`\n-# ${filtered.size - deleted.size} message(s) were older than 14 days and couldn't be deleted.`);
    }

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### ${MARK}  Messages Purged`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(details.join("\n")))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};