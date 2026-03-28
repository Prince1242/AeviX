/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /warnings
 *  View, clear, or remove warnings for a member.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Warn = require("../../schema/warn");
const Components = require("../../custom/components");
const { paginate } = require("../../utils/paginator");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "warnings",
  description: "View or manage a member's warnings",
  botPerms: ["ModerateMembers"],
  userPerms: ["ModerateMembers"],
  default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
  options: [
    {
      name: "user",
      description: "The user to view warnings for",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "action",
      description: "Action to perform on warnings",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "View", value: "view" },
        { name: "Clear All", value: "clear" },
        { name: "Remove One", value: "remove" },
      ],
    },
    {
      name: "warn_id",
      description: "Warn ID to remove (use with action: Remove One)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const user = interaction.options.getUser("user");
    const action = interaction.options.getString("action") || "view";
    const warnId = interaction.options.getString("warn_id");

    /* ── Clear All ───────────────────────────────── */
    if (action === "clear") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply(C.v2(C.fail("You need **Manage Server** permission to clear warnings.")));

      await interaction.deferReply();
      const result = await Warn.deleteMany({
        guildId: interaction.guild.id,
        userId: user.id,
      });

      const container = C.container(result.deletedCount ? COLORS.success : COLORS.warn)
        .addTextDisplayComponents(C.text(`### ${MARK}  Warnings Cleared`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          result.deletedCount
            ? `Removed **${result.deletedCount}** warning(s) from ${user.tag}.`
            : `${user.tag} has **no warnings** to clear.`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.editReply(C.v2(container));
    }

    /* ── Remove One ──────────────────────────────── */
    if (action === "remove") {
      if (!warnId)
        return interaction.reply(C.v2(C.fail("Provide a **warn_id** to remove. Use `/warnings user action:View` to see IDs.")));

      await interaction.deferReply();
      const deleted = await Warn.findOneAndDelete({
        guildId: interaction.guild.id,
        userId: user.id,
        warnId,
      });

      if (!deleted)
        return interaction.editReply(C.v2(C.fail(`No warning found with ID \`${warnId}\` for ${user.tag}.`)));

      const remaining = await Warn.countDocuments({
        guildId: interaction.guild.id,
        userId: user.id,
      });

      const container = C.container(COLORS.success)
        .addTextDisplayComponents(C.text(`### ${MARK}  Warning Removed`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Warn ID** · \`${warnId}\`\n` +
          `${e.dot} **Reason** · ${deleted.reason}\n` +
          `${e.dot} **Remaining** · \`${remaining}\` warning(s) for ${user.tag}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.editReply(C.v2(container));
    }

    /* ── View ────────────────────────────────────── */
    await interaction.deferReply();

    const warns = await Warn.find({
      guildId: interaction.guild.id,
      userId: user.id,
    }).sort({ timestamp: -1 });

    if (!warns.length) {
      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Warnings — ${user.displayName}`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`${e.tick} ${user.tag} has **no warnings**.`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.editReply(C.v2(container));
    }

    /* Format warnings into paginated items */
    const items = warns.map((w, i) => {
      const ts = Math.round(new Date(w.timestamp).getTime() / 1000);
      return (
        `**${i + 1}.** \`#${w.warnId}\` · <t:${ts}:R>\n` +
        `${e.dot} ${w.reason}\n` +
        `${e.dot} By <@${w.moderatorId}>`
      );
    });

    await paginate(interaction, client, {
      items,
      perPage: 5,
      title: `${MARK}  Warnings — ${user.displayName} (${warns.length})`,
      color: COLORS.warn,
      footer: FOOTER,
      userId: interaction.user.id,
    });
  },
};