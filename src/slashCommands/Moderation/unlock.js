/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /unlock
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits, ChannelType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

const LOCKABLE = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
]);

module.exports = {
  name: "unlock",
  description: "Unlock a channel, restoring message permissions",
  botPerms: ["ManageChannels"],
  userPerms: ["ManageChannels"],
  default_member_permissions: PermissionFlagsBits.ManageChannels.toString(),
  options: [
    {
      name: "channel",
      description: "Channel to unlock (defaults to current)",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    },
    {
      name: "reason",
      description: "Reason for unlocking",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!LOCKABLE.has(channel.type))
      return interaction.reply(C.v2(C.fail("That channel type cannot be unlocked.")));

    /* Check if not locked */
    const everyonePerms = channel.permissionOverwrites.cache.get(interaction.guild.id);
    if (!everyonePerms?.deny.has(PermissionFlagsBits.SendMessages))
      return interaction.reply(C.v2(C.fail(`${channel} is **not locked**.`)));

    await interaction.deferReply();

    try {
      await channel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: null,
        SendMessagesInThreads: null,
        CreatePublicThreads: null,
        AddReactions: null,
      }, { reason: `${interaction.user.tag}: ${reason}` });
    } catch (err) {
      return interaction.editReply(C.v2(C.fail(`Failed to unlock: ${err.message}`)));
    }

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### 🔓  Channel Unlocked`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Channel** · ${channel}\n` +
        `${e.dot} **Reason** · ${reason}\n` +
        `${e.dot} **Moderator** · ${interaction.user.displayName}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};