/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /prefix
 *  Set or reset the server's command prefix.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Prefix = require("../../schema/prefix");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;
const MAX_PREFIX_LENGTH = 5;

module.exports = {
  name: "prefix",
  description: "Set or reset the server command prefix",
  userPerms: ["ManageGuild"],
  default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
  options: [
    {
      name: "set",
      description: "Set a new command prefix",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "prefix",
          description: "New prefix (max 5 characters)",
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: MAX_PREFIX_LENGTH,
        },
      ],
    },
    {
      name: "reset",
      description: "Reset the prefix to default",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    /* ═══════════════════════════════════════════════
     *  SET
     * ═══════════════════════════════════════════════ */
    if (sub === "set") {
      const newPrefix = interaction.options.getString("prefix").trim();

      if (!newPrefix)
        return interaction.reply(C.v2(C.fail("Prefix cannot be empty or whitespace.")));
      if (newPrefix.length > MAX_PREFIX_LENGTH)
        return interaction.reply(C.v2(C.fail(`Prefix must be **${MAX_PREFIX_LENGTH}** characters or fewer.`)));

      const existing = await Prefix.findOne({ Guild: guildId });
      const oldPrefix = existing?.Prefix || client.prefix;

      await Prefix.findOneAndUpdate(
        { Guild: guildId },
        { Guild: guildId, Prefix: newPrefix, oldPrefix },
        { upsert: true }
      );

      const container = C.container(COLORS.success)
        .addTextDisplayComponents(C.text(`### ${MARK}  Prefix Updated`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Old Prefix** · \`${oldPrefix}\`\n` +
          `${e.dot} **New Prefix** · \`${newPrefix}\`\n\n` +
          `-# Try \`${newPrefix}help\` or use \`/\` slash commands.`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  RESET
     * ═══════════════════════════════════════════════ */
    if (sub === "reset") {
      const deleted = await Prefix.deleteOne({ Guild: guildId });

      return interaction.reply(C.v2(
        deleted.deletedCount
          ? C.ok(`Prefix reset to default \`${client.prefix}\`.`)
          : C.caution(`Prefix is already the default \`${client.prefix}\`.`)
      ));
    }
  },
};