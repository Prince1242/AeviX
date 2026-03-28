/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /untimeout
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "untimeout",
  description: "Remove a member's timeout",
  botPerms: ["ModerateMembers"],
  userPerms: ["ModerateMembers"],
  default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
  options: [
    {
      name: "user",
      description: "The member to untimeout",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for removing timeout",
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
    if (!member.isCommunicationDisabled())
      return interaction.reply(C.v2(C.fail("That user is **not timed out**.")));
    if (!member.moderatable)
      return interaction.reply(C.v2(C.fail("I cannot modify that user — they have a higher role than me.")));

    await interaction.deferReply();

    try {
      await member.timeout(null, `${interaction.user.tag}: ${reason}`);
    } catch (err) {
      return interaction.editReply(C.v2(C.fail(`Failed to remove timeout: ${err.message}`)));
    }

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### ${MARK}  Timeout Removed`))
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