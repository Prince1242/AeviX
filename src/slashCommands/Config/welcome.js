/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /welcome
 *  Full welcome system configuration with preview.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const { getSettings } = require("../../schema/welcomesystem");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

/* ── Placeholders reference ──────────────────────── */
const PLACEHOLDERS =
  `\`{user}\` Mention · \`{user_name}\` Username · \`{user_id}\` User ID\n` +
  `\`{user_display}\` Display name · \`{user_avatar}\` Avatar URL\n` +
  `\`{user_created:at}\` Account age · \`{server_name}\` Server name\n` +
  `\`{server_memberCount}\` Member count · \`{server_icon}\` Server icon\n` +
  `\`{server_owner}\` Owner mention · \`\\n\` New line`;

module.exports = {
  name: "welcome",
  description: "Configure the welcome message system",
  userPerms: ["ManageGuild"],
  default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
  options: [
    {
      name: "enable",
      description: "Enable welcome messages",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "disable",
      description: "Disable welcome messages",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "channel",
      description: "Set the welcome message channel",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "channel",
          description: "Channel for welcome messages",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
      ],
    },
    {
      name: "message",
      description: "Set the welcome embed description",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "text",
          description: "Welcome description (supports placeholders)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "title",
      description: "Set the welcome embed title",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "text",
          description: "Embed title (supports placeholders)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "footer",
      description: "Set the welcome embed footer",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "text",
          description: "Embed footer text (supports placeholders)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "image",
      description: "Set the welcome embed image",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "url",
          description: "Image URL or {server_icon} / {user_avatar}",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "thumbnail",
      description: "Set the welcome embed thumbnail",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "url",
          description: "Thumbnail URL or {server_icon} / {user_avatar}",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "autodelete",
      description: "Auto-delete welcome messages after X seconds (0 = off)",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "seconds",
          description: "Seconds before deletion (0 = off, max 300)",
          type: ApplicationCommandOptionType.Integer,
          required: true,
          min_value: 0,
          max_value: 300,
        },
      ],
    },
    {
      name: "preview",
      description: "Send a preview of the welcome message",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "status",
      description: "View current welcome configuration",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const sub = interaction.options.getSubcommand();

    const settings = await getSettings(interaction.guild);

    /* Ensure welcome object exists */
    if (!settings.welcome) {
      settings.welcome = { enabled: false, embed: {} };
    }
    if (!settings.welcome.embed) {
      settings.welcome.embed = {};
    }

    /* ═══════════════════════════════════════════════
     *  ENABLE
     * ═══════════════════════════════════════════════ */
    if (sub === "enable") {
      settings.welcome.enabled = true;
      await settings.save();

      const hasChannel = !!settings.welcome.channel;

      const container = C.container(COLORS.success)
        .addTextDisplayComponents(C.text(`### ${MARK}  Welcome Messages Enabled`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          hasChannel
            ? `Welcome messages will be sent to <#${settings.welcome.channel}>.`
            : `${e.warn} **No channel set!** Use \`/welcome channel\` to configure where messages are sent.`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  DISABLE
     * ═══════════════════════════════════════════════ */
    if (sub === "disable") {
      settings.welcome.enabled = false;
      await settings.save();
      return interaction.reply(C.v2(C.caution("Welcome messages have been **disabled**.")));
    }

    /* ═══════════════════════════════════════════════
     *  CHANNEL
     * ═══════════════════════════════════════════════ */
    if (sub === "channel") {
      const channel = interaction.options.getChannel("channel");

      if (!client.util.canSendEmbeds(channel))
        return interaction.reply(C.v2(
          C.fail(`I need **Send Messages** and **Embed Links** permissions in ${channel}.`)
        ));

      settings.welcome.channel = channel.id;
      await settings.save();
      return interaction.reply(C.v2(C.ok(`Welcome messages will now be sent to ${channel}.`)));
    }

    /* ═══════════════════════════════════════════════
     *  MESSAGE (description)
     * ═══════════════════════════════════════════════ */
    if (sub === "message") {
      const text = interaction.options.getString("text");
      settings.welcome.embed.description = text;
      await settings.save();

      return interaction.reply(C.v2(
        C.ok(`Welcome description updated.\nPreview: \`/welcome preview\``)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  TITLE
     * ═══════════════════════════════════════════════ */
    if (sub === "title") {
      settings.welcome.embed.title = interaction.options.getString("text");
      await settings.save();
      return interaction.reply(C.v2(C.ok("Welcome title updated.")));
    }

    /* ═══════════════════════════════════════════════
     *  FOOTER
     * ═══════════════════════════════════════════════ */
    if (sub === "footer") {
      settings.welcome.embed.footer = interaction.options.getString("text");
      await settings.save();
      return interaction.reply(C.v2(C.ok("Welcome footer updated.")));
    }

    /* ═══════════════════════════════════════════════
     *  IMAGE
     * ═══════════════════════════════════════════════ */
    if (sub === "image") {
      const url = interaction.options.getString("url");
      if (url === "off" || url === "none" || url === "false") {
        settings.welcome.embed.image = "";
        await settings.save();
        return interaction.reply(C.v2(C.ok("Welcome image removed.")));
      }
      settings.welcome.embed.image = url;
      await settings.save();
      return interaction.reply(C.v2(C.ok(`Welcome image set. Use \`/welcome preview\` to test.`)));
    }

    /* ═══════════════════════════════════════════════
     *  THUMBNAIL
     * ═══════════════════════════════════════════════ */
    if (sub === "thumbnail") {
      const url = interaction.options.getString("url");
      if (url === "off" || url === "none" || url === "false") {
        settings.welcome.embed.thumbnail = "";
        await settings.save();
        return interaction.reply(C.v2(C.ok("Welcome thumbnail removed.")));
      }
      settings.welcome.embed.thumbnail = url;
      await settings.save();
      return interaction.reply(C.v2(C.ok(`Welcome thumbnail set. Use \`/welcome preview\` to test.`)));
    }

    /* ═══════════════════════════════════════════════
     *  AUTODELETE
     * ═══════════════════════════════════════════════ */
    if (sub === "autodelete") {
      const seconds = interaction.options.getInteger("seconds");
      settings.welcome.autodel = seconds;
      await settings.save();

      return interaction.reply(C.v2(
        seconds === 0
          ? C.ok("Welcome message auto-delete **disabled**.")
          : C.ok(`Welcome messages will auto-delete after **${seconds}s**.`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  PREVIEW
     * ═══════════════════════════════════════════════ */
    if (sub === "preview") {
      if (!settings.welcome.enabled)
        return interaction.reply(C.v2(C.fail("Welcome messages are **disabled**. Enable them first.")));
      if (!settings.welcome.channel)
        return interaction.reply(C.v2(C.fail("No welcome channel configured. Use `/welcome channel`.")));

      await interaction.deferReply();

      try {
        const result = await client.util.sendPreview(settings, interaction.member);
        return interaction.editReply(C.v2(C.ok(result)));
      } catch (err) {
        return interaction.editReply(C.v2(C.fail(`Preview failed: ${err.message}`)));
      }
    }

    /* ═══════════════════════════════════════════════
     *  STATUS
     * ═══════════════════════════════════════════════ */
    if (sub === "status") {
      const w = settings.welcome;
      const em = w.embed || {};

      const enabled = w.enabled ? `${e.tick} Enabled` : `${e.cross} Disabled`;
      const channel = w.channel ? `<#${w.channel}>` : "Not set";
      const autodel = w.autodel ? `${w.autodel}s` : "Off";

      const embedFields = [
        `${e.dot} **Title** · ${em.title || "*Not set*"}`,
        `${e.dot} **Description** · ${em.description ? `\`${em.description.substring(0, 60)}${em.description.length > 60 ? "..." : ""}\`` : "*Not set*"}`,
        `${e.dot} **Footer** · ${em.footer || "*Not set*"}`,
        `${e.dot} **Image** · ${em.image || "*Not set*"}`,
        `${e.dot} **Thumbnail** · ${em.thumbnail || "*Not set*"}`,
      ].join("\n");

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Welcome — Configuration`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Status** · ${enabled}\n` +
          `${e.dot} **Channel** · ${channel}\n` +
          `${e.dot} **Auto-Delete** · ${autodel}\n\n` +
          `**Embed Settings**\n${embedFields}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**Placeholders**\n${PLACEHOLDERS}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Use /welcome preview to test your configuration`));

      return interaction.reply(C.v2(container));
    }
  },
};