/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /kick
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "kick",
  description: "Kick a member from the server",
  botPerms: ["KickMembers"],
  userPerms: ["KickMembers"],
  default_member_permissions: PermissionFlagsBits.KickMembers.toString(),
  options: [
    {
      name: "user",
      description: "The member to kick",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the kick",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    const member = interaction.guild.members.cache.get(user.id)
      || await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return interaction.reply(C.v2(C.fail("That user is **not in this server**.")));
    if (user.id === interaction.user.id)
      return interaction.reply(C.v2(C.fail("You cannot kick yourself.")));
    if (user.id === client.user.id)
      return interaction.reply(C.v2(C.fail("I cannot kick myself.")));
    if (user.id === interaction.guild.ownerId)
      return interaction.reply(C.v2(C.fail("You cannot kick the server owner.")));
    if (
      member.roles.highest.position >= interaction.member.roles.highest.position &&
      interaction.user.id !== interaction.guild.ownerId
    )
      return interaction.reply(C.v2(C.fail("That user has a **higher or equal role** than you.")));
    if (!member.kickable)
      return interaction.reply(C.v2(C.fail("I cannot kick that user — they have a higher role than me.")));

    await interaction.deferReply();

    /* ── DM notification ─────────────────────────── */
    try {
      const dm = C.container(COLORS.warn)
        .addTextDisplayComponents(C.text(`### ${MARK}  You've been Kicked`))
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

    /* ── Execute kick ────────────────────────────── */
    try {
      await member.kick(`${interaction.user.tag}: ${reason}`);
    } catch (err) {
      return interaction.editReply(C.v2(C.fail(`Failed to kick: ${err.message}`)));
    }

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### ${MARK}  Member Kicked`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Target** · ${user.tag} (\`${user.id}\`)\n` +
        `${e.dot} **Reason** · ${reason}\n` +
        `${e.dot} **Moderator** · ${interaction.user.displayName}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};