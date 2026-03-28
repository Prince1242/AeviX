/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /automod
 *  Manages antilink and antispam systems.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const AntiLink = require("../../schema/antilink");
const AntiSpam = require("../../schema/antispam");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "automod",
  description: "Configure auto-moderation (antilink & antispam)",
  userPerms: ["ManageGuild"],
  botPerms: ["ManageMessages", "ModerateMembers"],
  default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
  options: [
    {
      name: "status",
      description: "View current automod configuration",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "antilink",
      description: "Toggle the antilink system",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "enabled",
          description: "Enable or disable antilink",
          type: ApplicationCommandOptionType.Boolean,
          required: true,
        },
      ],
    },
    {
      name: "antispam",
      description: "Configure the antispam system",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "enabled",
          description: "Enable or disable antispam",
          type: ApplicationCommandOptionType.Boolean,
          required: true,
        },
        {
          name: "threshold",
          description: "Messages before action (3-20, default 5)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 3,
          max_value: 20,
        },
        {
          name: "timeframe",
          description: "Timeframe in seconds (5-60, default 10)",
          type: ApplicationCommandOptionType.Integer,
          required: false,
          min_value: 5,
          max_value: 60,
        },
      ],
    },
    {
      name: "whitelist",
      description: "Whitelist a user or role from automod detection",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "module",
          description: "Which module to whitelist for",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Antilink", value: "antilink" },
            { name: "Antispam", value: "antispam" },
          ],
        },
        {
          name: "action",
          description: "Add or remove from whitelist",
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
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    /* ═══════════════════════════════════════════════
     *  STATUS
     * ═══════════════════════════════════════════════ */
    if (sub === "status") {
      const [linkData, spamData] = await Promise.all([
        AntiLink.findOne({ guildId }),
        AntiSpam.findOne({ guildId }),
      ]);

      const linkEnabled = linkData?.isEnabled || false;
      const spamEnabled = spamData?.isEnabled || false;

      /* ── Antilink info ─────────────────────────── */
      const linkWlUsers = linkData?.whitelistUsers?.length
        ? linkData.whitelistUsers.map((id) => `<@${id}>`).join(", ")
        : "None";
      const linkWlRoles = linkData?.whitelistRoles?.length
        ? linkData.whitelistRoles.map((id) => `<@&${id}>`).join(", ")
        : "None";

      /* ── Antispam info ─────────────────────────── */
      const threshold = spamData?.messageThreshold || 5;
      const timeframe = spamData?.timeframe || 10;
      const spamWlUsers = spamData?.whitelistUsers?.length
        ? spamData.whitelistUsers.map((id) => `<@${id}>`).join(", ")
        : "None";
      const spamWlRoles = spamData?.whitelistRoles?.length
        ? spamData.whitelistRoles.map((id) => `<@&${id}>`).join(", ")
        : "None";

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${e.shield}  AutoMod — Configuration`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**Antilink** ${linkEnabled ? e.tick : e.cross}\n` +
          `${e.dot} Blocks Discord invites and external links\n` +
          `${e.dot} Whitelisted Users · ${linkWlUsers}\n` +
          `${e.dot} Whitelisted Roles · ${linkWlRoles}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**Antispam** ${spamEnabled ? e.tick : e.cross}\n` +
          `${e.dot} Threshold · \`${threshold}\` messages in \`${timeframe}s\`\n` +
          `${e.dot} Whitelisted Users · ${spamWlUsers}\n` +
          `${e.dot} Whitelisted Roles · ${spamWlRoles}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(
          C.text(`-# ${MARK} Use /automod antilink, antispam, whitelist to configure`)
        );

      return interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  ANTILINK
     * ═══════════════════════════════════════════════ */
    if (sub === "antilink") {
      const enabled = interaction.options.getBoolean("enabled");

      await AntiLink.findOneAndUpdate(
        { guildId },
        { $set: { isEnabled: enabled } },
        { upsert: true }
      );

      return interaction.reply(C.v2(
        enabled
          ? C.ok("**Antilink** has been **enabled**. Links and invites will be blocked.")
          : C.caution("**Antilink** has been **disabled**.")
      ));
    }

    /* ═══════════════════════════════════════════════
     *  ANTISPAM
     * ═══════════════════════════════════════════════ */
    if (sub === "antispam") {
      const enabled = interaction.options.getBoolean("enabled");
      const threshold = interaction.options.getInteger("threshold");
      const timeframe = interaction.options.getInteger("timeframe");

      const update = { isEnabled: enabled };
      if (threshold !== null) update.messageThreshold = threshold;
      if (timeframe !== null) update.timeframe = timeframe;

      const data = await AntiSpam.findOneAndUpdate(
        { guildId },
        { $set: update },
        { upsert: true, new: true }
      );

      if (!enabled) {
        return interaction.reply(C.v2(C.caution("**Antispam** has been **disabled**.")));
      }

      return interaction.reply(C.v2(
        C.ok(
          `**Antispam** has been **enabled**.\n` +
          `${e.dot} Threshold · \`${data.messageThreshold}\` messages\n` +
          `${e.dot} Timeframe · \`${data.timeframe}s\``
        )
      ));
    }

    /* ═══════════════════════════════════════════════
     *  WHITELIST
     * ═══════════════════════════════════════════════ */
    if (sub === "whitelist") {
      const moduleName = interaction.options.getString("module");
      const action = interaction.options.getString("action");
      const user = interaction.options.getUser("user");
      const role = interaction.options.getRole("role");

      if (!user && !role)
        return interaction.reply(C.v2(C.fail("Provide a **user** or **role** to whitelist.")));

      const Model = moduleName === "antilink" ? AntiLink : AntiSpam;
      let data = await Model.findOne({ guildId });
      if (!data) data = await Model.create({ guildId });

      const changes = [];

      if (user) {
        const list = data.whitelistUsers || [];
        if (action === "add") {
          if (list.includes(user.id))
            return interaction.reply(C.v2(C.fail(`${user} is already whitelisted for **${moduleName}**.`)));
          list.push(user.id);
          changes.push(`${e.tick} Added **${user.tag}** to ${moduleName} whitelist`);
        } else {
          if (!list.includes(user.id))
            return interaction.reply(C.v2(C.fail(`${user} is not whitelisted for **${moduleName}**.`)));
          data.whitelistUsers = list.filter((id) => id !== user.id);
          changes.push(`${e.cross} Removed **${user.tag}** from ${moduleName} whitelist`);
        }
        if (action === "add") data.whitelistUsers = list;
      }

      if (role) {
        const list = data.whitelistRoles || [];
        if (action === "add") {
          if (list.includes(role.id))
            return interaction.reply(C.v2(C.fail(`${role} is already whitelisted for **${moduleName}**.`)));
          list.push(role.id);
          changes.push(`${e.tick} Added **${role.name}** role to ${moduleName} whitelist`);
        } else {
          if (!list.includes(role.id))
            return interaction.reply(C.v2(C.fail(`${role} is not whitelisted for **${moduleName}**.`)));
          data.whitelistRoles = list.filter((id) => id !== role.id);
          changes.push(`${e.cross} Removed **${role.name}** role from ${moduleName} whitelist`);
        }
        if (action === "add") data.whitelistRoles = list;
      }

      await data.save();
      return interaction.reply(C.v2(C.ok(changes.join("\n"))));
    }
  },
};