/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /ban
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "ban",
  description: "Ban a member from the server",
  botPerms: ["BanMembers"],
  userPerms: ["BanMembers"],
  default_member_permissions: PermissionFlagsBits.BanMembers.toString(),
  options: [
    {
      name: "user",
      description: "The user to ban",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the ban",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "delete_history",
      description: "How much message history to delete",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "Don't delete", value: "0" },
        { name: "Last hour", value: "3600" },
        { name: "Last 6 hours", value: "21600" },
        { name: "Last 24 hours", value: "86400" },
        { name: "Last 3 days", value: "259200" },
        { name: "Last 7 days", value: "604800" },
      ],
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const deleteSeconds = parseInt(interaction.options.getString("delete_history") || "0");

    /* ── Hierarchy checks ────────────────────────── */
    if (user.id === interaction.user.id)
      return interaction.reply(C.v2(C.fail("You cannot ban yourself.")));
    if (user.id === client.user.id)
      return interaction.reply(C.v2(C.fail("I cannot ban myself.")));
    if (user.id === interaction.guild.ownerId)
      return interaction.reply(C.v2(C.fail("You cannot ban the server owner.")));

    const member = interaction.guild.members.cache.get(user.id)
      || await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
      if (
        member.roles.highest.position >= interaction.member.roles.highest.position &&
        interaction.user.id !== interaction.guild.ownerId
      )
        return interaction.reply(C.v2(C.fail("That user has a **higher or equal role** than you.")));
      if (!member.bannable)
        return interaction.reply(C.v2(C.fail("I cannot ban that user — they have a higher role than me.")));
    }

    await interaction.deferReply();

    /* ── DM notification ─────────────────────────── */
    try {
      const dm = C.container(COLORS.error)
        .addTextDisplayComponents(C.text(`### ${MARK}  You've been Banned`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Server** · ${interaction.guild.name}\n` +
          `${e.dot} **Reason** · ${reason}\n` +
          `${e.dot} **Moderator** · ${interaction.user.displayName}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));
      await user.send(C.v2(dm)).catch(() => null);
    } catch {}

    /* ── Execute ban ─────────────────────────────── */
    try {
      await interaction.guild.members.ban(user.id, {
        reason: `${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteSeconds,
      });
    } catch (err) {
      return interaction.editReply(C.v2(C.fail(`Failed to ban: ${err.message}`)));
    }

    /* ── Response ────────────────────────────────── */
    const historyLabel = {
      "0": "None", "3600": "Last hour", "21600": "Last 6 hours",
      "86400": "Last 24 hours", "259200": "Last 3 days", "604800": "Last 7 days",
    }[String(deleteSeconds)] || "None";

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### ${MARK}  Member Banned`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Target** · ${user.tag} (\`${user.id}\`)\n` +
        `${e.dot} **Reason** · ${reason}\n` +
        `${e.dot} **Delete History** · ${historyLabel}\n` +
        `${e.dot} **Moderator** · ${interaction.user.displayName}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};