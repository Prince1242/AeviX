/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /slowmode
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "slowmode",
  description: "Set the slowmode for a channel",
  botPerms: ["ManageChannels"],
  userPerms: ["ManageChannels"],
  default_member_permissions: PermissionFlagsBits.ManageChannels.toString(),
  options: [
    {
      name: "duration",
      description: "Slowmode duration",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Off",          value: "0" },
        { name: "5 seconds",    value: "5" },
        { name: "10 seconds",   value: "10" },
        { name: "15 seconds",   value: "15" },
        { name: "30 seconds",   value: "30" },
        { name: "1 minute",     value: "60" },
        { name: "2 minutes",    value: "120" },
        { name: "5 minutes",    value: "300" },
        { name: "10 minutes",   value: "600" },
        { name: "15 minutes",   value: "900" },
        { name: "30 minutes",   value: "1800" },
        { name: "1 hour",       value: "3600" },
        { name: "2 hours",      value: "7200" },
        { name: "6 hours",      value: "21600" },
      ],
    },
    {
      name: "channel",
      description: "Channel to set slowmode in (defaults to current)",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const seconds = parseInt(interaction.options.getString("duration"));
    const channel = interaction.options.getChannel("channel") || interaction.channel;

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement &&
      channel.type !== ChannelType.GuildForum
    )
      return interaction.reply(C.v2(C.fail("Slowmode cannot be set on that channel type.")));

    await interaction.deferReply();

    try {
      await channel.setRateLimitPerUser(seconds, `${interaction.user.tag}`);
    } catch (err) {
      return interaction.editReply(C.v2(C.fail(`Failed to set slowmode: ${err.message}`)));
    }

    /* ── Duration label ──────────────────────────── */
    const labels = {
      0: "Off", 5: "5 seconds", 10: "10 seconds", 15: "15 seconds",
      30: "30 seconds", 60: "1 minute", 120: "2 minutes", 300: "5 minutes",
      600: "10 minutes", 900: "15 minutes", 1800: "30 minutes",
      3600: "1 hour", 7200: "2 hours", 21600: "6 hours",
    };

    const isOff = seconds === 0;

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(
        C.text(`### ${MARK}  Slowmode ${isOff ? "Disabled" : "Updated"}`)
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Channel** · ${channel}\n` +
        `${e.dot} **Slowmode** · ${labels[seconds] || `${seconds}s`}\n` +
        `${e.dot} **Moderator** · ${interaction.user.displayName}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};