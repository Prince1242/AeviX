/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /antinuke
 *  Full antinuke configuration panel with 9 subcommands.
 *  Only server owner + extra owners can configure.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");
const { MODULE_DEFAULTS, MODULE_LABELS, getModule } = require("../../utils/antinuke");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

/* ── Module choices for select ───────────────────── */
const MODULE_CHOICES = Object.entries(MODULE_LABELS).map(([key, label]) => ({
  name: label,
  value: key,
}));

module.exports = {
  name: "antinuke",
  description: "Configure antinuke server protection",
  default_member_permissions: PermissionFlagsBits.Administrator.toString(),
  options: [
    {
      name: "enable",
      description: "Enable antinuke protection",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "disable",
      description: "Disable antinuke protection",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "status",
      description: "View the full antinuke configuration panel",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "punishment",
      description: "Set the punishment for detected threats",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Punishment type to apply",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Ban", value: "ban" },
            { name: "Kick", value: "kick" },
            { name: "Strip Roles", value: "stripRoles" },
          ],
        },
      ],
    },
    {
      name: "log",
      description: "Set the antinuke log channel",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "channel",
          description: "Channel for antinuke logs",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
      ],
    },
    {
      name: "whitelist",
      description: "Add or remove a user or role from the whitelist",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "action",
          description: "Add or remove",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Add", value: "add" },
            { name: "Remove", value: "remove" },
          ],
        },
        {
          name: "user",
          description: "User to whitelist",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
        {
          name: "role",
          description: "Role to whitelist",
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
      ],
    },
    {
      name: "extraowner",
      description: "Add or remove an extra owner",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "action",
          description: "Add or remove",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Add", value: "add" },
            { name: "Remove", value: "remove" },
          ],
        },
        {
          name: "user",
          description: "User to add/remove as extra owner",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: "module",
      description: "Configure a specific protection module",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "Module to configure",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: MODULE_CHOICES,
        },
        {
          name: "enabled",
          description: "Enable or disable this module",
          type: ApplicationCommandOptionType.Boolean,
          required: true,
        },
        {
          name: "threshold",
          description: "Max actions before punishment (1-20)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 1,
          max_value: 20,
        },
        {
          name: "timeframe",
          description: "Timeframe window in seconds (10-300)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 10,
          max_value: 300,
        },
      ],
    },
    {
      name: "reset",
      description: "Reset antinuke to default settings",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const isOwner = interaction.user.id === interaction.guild.ownerId;

    /* ── Fetch existing data ─────────────────────── */
    let data = await AntiNuke.findOne({ guildId });

    /* Owner-only gate for critical operations */
    const OWNER_ONLY = new Set(["enable", "disable", "extraowner", "reset"]);
    if (OWNER_ONLY.has(sub) && !isOwner) {
      return interaction.reply(C.v2(C.fail("Only the **server owner** can perform this action.")));
    }

    /* General config gate: owner + extra owners */
    if (!isOwner && !data?.extraOwners?.includes(interaction.user.id)) {
      return interaction.reply(
        C.v2(C.fail("Only the **server owner** and **extra owners** can configure antinuke."))
      );
    }

    /* ═══════════════════════════════════════════════
     *  ENABLE
     * ═══════════════════════════════════════════════ */
    if (sub === "enable") {
      data = await AntiNuke.findOneAndUpdate(
        { guildId },
        { $set: { isEnabled: true } },
        { upsert: true, new: true }
      );

      const container = C.container(COLORS.success)
        .addTextDisplayComponents(C.text(`### ${e.shield}  Antinuke Enabled`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `Antinuke protection is now **active** for this server.\n\n` +
          `${e.dot} Use \`/antinuke status\` to view configuration\n` +
          `${e.dot} Use \`/antinuke log #channel\` to set a log channel\n` +
          `${e.dot} Use \`/antinuke module\` to configure modules`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  DISABLE
     * ═══════════════════════════════════════════════ */
    if (sub === "disable") {
      if (!data?.isEnabled)
        return interaction.reply(C.v2(C.fail("Antinuke is already **disabled**.")));

      data.isEnabled = false;
      await data.save();

      return interaction.reply(C.v2(
        C.container(COLORS.warn)
          .addTextDisplayComponents(C.text(`### ${e.warn}  Antinuke Disabled`))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(
            `Antinuke protection has been **disabled**.\n` +
            `-# Your server is no longer protected. Use \`/antinuke enable\` to re-activate.`
          ))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(FOOTER))
      ));
    }

    /* ═══════════════════════════════════════════════
     *  STATUS
     * ═══════════════════════════════════════════════ */
    if (sub === "status") {
      if (!data) {
        return interaction.reply(C.v2(
          C.container(COLORS.brand)
            .addTextDisplayComponents(C.text(`### ${e.shield}  Antinuke — Not Configured`))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(
              `Antinuke has not been set up yet.\n` +
              `Use \`/antinuke enable\` to activate protection.`
            ))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(FOOTER))
        ));
      }

      const enabled = data.isEnabled;
      const punishment = (data.punishment || "ban").toUpperCase();
      const logCh = data.logChannelId ? `<#${data.logChannelId}>` : "Not set";

      const extraOwners = data.extraOwners?.length
        ? data.extraOwners.map((id) => `<@${id}>`).join(", ")
        : "None";
      const wlUsers = data.whitelistUsers?.length
        ? data.whitelistUsers.map((id) => `<@${id}>`).join(", ")
        : "None";
      const wlRoles = data.whitelistRoles?.length
        ? data.whitelistRoles.map((id) => `<@&${id}>`).join(", ")
        : "None";

      /* ── Module grid ─────────────────────────── */
      const moduleLines = Object.keys(MODULE_LABELS).map((key) => {
        const mod = getModule(data, key);
        const icon = mod.enabled ? e.tick : e.cross;
        return `${icon} **${MODULE_LABELS[key]}** · \`${mod.threshold}\` / \`${mod.timeframe}s\``;
      });

      const sysBlock =
        `${e.dot} **Status** · ${enabled ? `${e.tick} Enabled` : `${e.cross} Disabled`}\n` +
        `${e.dot} **Punishment** · \`${punishment}\`\n` +
        `${e.dot} **Log Channel** · ${logCh}\n\n` +
        `${e.dot} **Extra Owners** · ${extraOwners}\n` +
        `${e.dot} **Whitelisted Users** · ${wlUsers}\n` +
        `${e.dot} **Whitelisted Roles** · ${wlRoles}`;

      const container = C.container(enabled ? COLORS.brand : COLORS.muted)
        .addTextDisplayComponents(C.text(`### ${e.shield}  Antinuke — Control Panel`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(sysBlock))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`**Protection Modules**\n\n${moduleLines.join("\n")}`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(
          C.text(`-# ${MARK} Use /antinuke module, whitelist, extraowner, punishment, log to configure`)
        );

      return interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  PUNISHMENT
     * ═══════════════════════════════════════════════ */
    if (sub === "punishment") {
      const type = interaction.options.getString("type");

      data = await AntiNuke.findOneAndUpdate(
        { guildId },
        { $set: { punishment: type } },
        { upsert: true, new: true }
      );

      const labels = { ban: "Ban", kick: "Kick", stripRoles: "Strip Roles" };
      return interaction.reply(C.v2(
        C.ok(`Antinuke punishment set to **${labels[type]}**.`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  LOG CHANNEL
     * ═══════════════════════════════════════════════ */
    if (sub === "log") {
      const channel = interaction.options.getChannel("channel");

      data = await AntiNuke.findOneAndUpdate(
        { guildId },
        { $set: { logChannelId: channel.id } },
        { upsert: true, new: true }
      );

      return interaction.reply(C.v2(
        C.ok(`Antinuke logs will be sent to ${channel}.`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  WHITELIST
     * ═══════════════════════════════════════════════ */
    if (sub === "whitelist") {
      const action = interaction.options.getString("action");
      const user = interaction.options.getUser("user");
      const role = interaction.options.getRole("role");

      if (!user && !role)
        return interaction.reply(C.v2(C.fail("Provide a **user** or **role** to whitelist.")));

      if (!data) {
        data = await AntiNuke.create({ guildId });
      }

      const changes = [];

      if (user) {
        if (action === "add") {
          if (data.whitelistUsers.includes(user.id))
            return interaction.reply(C.v2(C.fail(`${user} is already whitelisted.`)));
          data.whitelistUsers.push(user.id);
          changes.push(`${e.tick} Added **${user.tag}** to whitelist`);
        } else {
          if (!data.whitelistUsers.includes(user.id))
            return interaction.reply(C.v2(C.fail(`${user} is not whitelisted.`)));
          data.whitelistUsers = data.whitelistUsers.filter((id) => id !== user.id);
          changes.push(`${e.cross} Removed **${user.tag}** from whitelist`);
        }
      }

      if (role) {
        if (action === "add") {
          if (data.whitelistRoles.includes(role.id))
            return interaction.reply(C.v2(C.fail(`${role} is already whitelisted.`)));
          data.whitelistRoles.push(role.id);
          changes.push(`${e.tick} Added **${role.name}** role to whitelist`);
        } else {
          if (!data.whitelistRoles.includes(role.id))
            return interaction.reply(C.v2(C.fail(`${role} is not whitelisted.`)));
          data.whitelistRoles = data.whitelistRoles.filter((id) => id !== role.id);
          changes.push(`${e.cross} Removed **${role.name}** role from whitelist`);
        }
      }

      await data.save();
      return interaction.reply(C.v2(C.ok(changes.join("\n"))));
    }

    /* ═══════════════════════════════════════════════
     *  EXTRA OWNER
     * ═══════════════════════════════════════════════ */
    if (sub === "extraowner") {
      const action = interaction.options.getString("action");
      const user = interaction.options.getUser("user");

      if (user.bot)
        return interaction.reply(C.v2(C.fail("Bots cannot be extra owners.")));
      if (user.id === interaction.guild.ownerId)
        return interaction.reply(C.v2(C.fail("The server owner is already authorized.")));

      if (!data) {
        data = await AntiNuke.create({ guildId });
      }

      if (action === "add") {
        if (data.extraOwners.includes(user.id))
          return interaction.reply(C.v2(C.fail(`${user} is already an extra owner.`)));
        data.extraOwners.push(user.id);
        await data.save();
        return interaction.reply(C.v2(
          C.ok(`Added **${user.tag}** as an extra owner.\nThey can now configure antinuke settings.`)
        ));
      } else {
        if (!data.extraOwners.includes(user.id))
          return interaction.reply(C.v2(C.fail(`${user} is not an extra owner.`)));
        data.extraOwners = data.extraOwners.filter((id) => id !== user.id);
        await data.save();
        return interaction.reply(C.v2(
          C.ok(`Removed **${user.tag}** from extra owners.`)
        ));
      }
    }

    /* ═══════════════════════════════════════════════
     *  MODULE
     * ═══════════════════════════════════════════════ */
    if (sub === "module") {
      const name = interaction.options.getString("name");
      const enabled = interaction.options.getBoolean("enabled");
      const threshold = interaction.options.getInteger("threshold");
      const timeframe = interaction.options.getInteger("timeframe");

      const label = MODULE_LABELS[name] || name;
      const defaults = MODULE_DEFAULTS[name] || { threshold: 3, timeframe: 60 };

      const update = { [`modules.${name}.enabled`]: enabled };
      if (threshold !== null) update[`modules.${name}.threshold`] = threshold;
      if (timeframe !== null) update[`modules.${name}.timeframe`] = timeframe;

      data = await AntiNuke.findOneAndUpdate(
        { guildId },
        { $set: update },
        { upsert: true, new: true }
      );

      const mod = getModule(data, name);

      const container = C.container(enabled ? COLORS.success : COLORS.warn)
        .addTextDisplayComponents(C.text(`### ${e.shield}  Module Updated`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**${label}**\n\n` +
          `${e.dot} **Status** · ${mod.enabled ? `${e.tick} Enabled` : `${e.cross} Disabled`}\n` +
          `${e.dot} **Threshold** · \`${mod.threshold}\` actions\n` +
          `${e.dot} **Timeframe** · \`${mod.timeframe}s\``
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  RESET
     * ═══════════════════════════════════════════════ */
    if (sub === "reset") {
      await AntiNuke.deleteOne({ guildId });

      return interaction.reply(C.v2(
        C.ok("Antinuke has been **reset** to defaults. Use `/antinuke enable` to re-configure.")
      ));
    }
  },
};