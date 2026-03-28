/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /autorole
 *  Auto-assign roles to humans or bots on join.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const AutoRole = require("../../schema/autorole");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "autorole",
  description: "Configure auto-assigned roles on member join",
  userPerms: ["ManageRoles"],
  botPerms: ["ManageRoles"],
  default_member_permissions: PermissionFlagsBits.ManageRoles.toString(),
  options: [
    {
      name: "add",
      description: "Add an autorole",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Assign to humans or bots",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Human", value: "human" },
            { name: "Bot", value: "bot" },
          ],
        },
        {
          name: "role",
          description: "Role to auto-assign",
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: "remove",
      description: "Remove an autorole",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Remove from humans or bots",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Human", value: "human" },
            { name: "Bot", value: "bot" },
          ],
        },
        {
          name: "role",
          description: "Role to remove from autorole",
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "View current autorole configuration",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "clear",
      description: "Clear all autoroles",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    /* ═══════════════════════════════════════════════
     *  ADD
     * ═══════════════════════════════════════════════ */
    if (sub === "add") {
      const type = interaction.options.getString("type");
      const role = interaction.options.getRole("role");

      /* Validation */
      if (role.managed)
        return interaction.reply(C.v2(C.fail("That role is **managed by an integration** and cannot be auto-assigned.")));
      if (role.id === interaction.guild.id)
        return interaction.reply(C.v2(C.fail("You cannot use the **@everyone** role.")));
      if (role.position >= interaction.guild.members.me.roles.highest.position)
        return interaction.reply(C.v2(C.fail("That role is **higher than my highest role**. I can't assign it.")));

      const field = type === "human" ? "humanRoles" : "botRoles";
      let data = await AutoRole.findOne({ guildId });

      if (data) {
        if (data[field].includes(role.id))
          return interaction.reply(C.v2(C.fail(`${role} is already a **${type}** autorole.`)));
        data[field].push(role.id);
        await data.save();
      } else {
        data = await AutoRole.create({ guildId, [field]: [role.id] });
      }

      return interaction.reply(C.v2(
        C.ok(`${role} will now be auto-assigned to **${type === "human" ? "humans" : "bots"}** on join.`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  REMOVE
     * ═══════════════════════════════════════════════ */
    if (sub === "remove") {
      const type = interaction.options.getString("type");
      const role = interaction.options.getRole("role");
      const field = type === "human" ? "humanRoles" : "botRoles";

      const data = await AutoRole.findOne({ guildId });
      if (!data || !data[field].includes(role.id))
        return interaction.reply(C.v2(C.fail(`${role} is not a **${type}** autorole.`)));

      data[field] = data[field].filter((id) => id !== role.id);
      await data.save();

      return interaction.reply(C.v2(
        C.ok(`${role} removed from **${type}** autoroles.`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  LIST
     * ═══════════════════════════════════════════════ */
    if (sub === "list") {
      const data = await AutoRole.findOne({ guildId });

      const humanRoles = data?.humanRoles?.length
        ? data.humanRoles.map((id) => `<@&${id}>`).join(", ")
        : "None configured";
      const botRoles = data?.botRoles?.length
        ? data.botRoles.map((id) => `<@&${id}>`).join(", ")
        : "None configured";

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Autorole — Configuration`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**Human Roles** (assigned to members on join)\n${humanRoles}\n\n` +
          `**Bot Roles** (assigned to bots on join)\n${botRoles}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(
          C.text(`-# ${MARK} Use /autorole add or remove to manage`)
        );

      return interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  CLEAR
     * ═══════════════════════════════════════════════ */
    if (sub === "clear") {
      const deleted = await AutoRole.deleteOne({ guildId });

      return interaction.reply(C.v2(
        deleted.deletedCount
          ? C.ok("All autoroles have been **cleared**.")
          : C.caution("No autoroles were configured.")
      ));
    }
  },
};