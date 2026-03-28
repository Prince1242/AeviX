/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /unban
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "unban",
  description: "Unban a user from the server",
  botPerms: ["BanMembers"],
  userPerms: ["BanMembers"],
  default_member_permissions: PermissionFlagsBits.BanMembers.toString(),
  options: [
    {
      name: "user_id",
      description: "The user ID to unban",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the unban",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const rawId = interaction.options.getString("user_id").replace(/[<@!>]/g, "").trim();
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!/^\d{17,20}$/.test(rawId))
      return interaction.reply(C.v2(C.fail("Please provide a valid **user ID**.")));

    await interaction.deferReply();

    /* ── Verify ban exists ───────────────────────── */
    const ban = await interaction.guild.bans.fetch(rawId).catch(() => null);
    if (!ban)
      return interaction.editReply(C.v2(C.fail(`User \`${rawId}\` is not banned.`)));

    /* ── Execute unban ───────────────────────────── */
    try {
      await interaction.guild.members.unban(rawId, `${interaction.user.tag}: ${reason}`);
    } catch (err) {
      return interaction.editReply(C.v2(C.fail(`Failed to unban: ${err.message}`)));
    }

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### ${MARK}  Member Unbanned`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **User** · ${ban.user.tag} (\`${ban.user.id}\`)\n` +
        `${e.dot} **Reason** · ${reason}\n` +
        `${e.dot} **Moderator** · ${interaction.user.displayName}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};