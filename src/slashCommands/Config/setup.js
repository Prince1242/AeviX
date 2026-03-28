/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /setup
 *  Creates a dedicated text + voice channel pair for music.
 *  Songs typed in the text channel auto-queue and auto-delete.
 *  Bot stays locked to the voice channel via 24/7 integration.
 * ══════════════════════════════════════════════════════════════════ */

const {
  ApplicationCommandOptionType, PermissionFlagsBits,
  ChannelType, PermissionsBitField,
} = require("discord.js");
const Setup = require("../../schema/setup");
const AutoReconnect = require("../../schema/247");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "setup",
  description: "Setup a persistent music request channel with dedicated voice",
  userPerms: ["ManageGuild", "ManageChannels"],
  botPerms: ["ManageChannels", "SendMessages", "EmbedLinks", "ManageMessages", "Connect", "Speak"],
  default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
  options: [
    {
      name: "create",
      description: "Create a music request text + voice channel",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "delete",
      description: "Remove the music request setup and channels",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "status",
      description: "View current music request channel setup",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    /* ═══════════════════════════════════════════════
     *  CREATE
     * ═══════════════════════════════════════════════ */
    if (sub === "create") {
      /* ── Check existing setup ──────────────────── */
      const existing = await Setup.findOne({ Guild: guildId });
      if (existing) {
        const ch = interaction.guild.channels.cache.get(existing.Channel);
        const vc = interaction.guild.channels.cache.get(existing.voiceChannel);
        if (ch || vc) {
          return interaction.reply(C.v2(
            C.fail(
              `Setup already exists.\n` +
              `${e.dot} Text: ${ch ? ch.toString() : "*(deleted)*"}\n` +
              `${e.dot} Voice: ${vc ? vc.toString() : "*(deleted)*"}\n\n` +
              `Use \`/setup delete\` first to reconfigure.`
            )
          ));
        }
        /* Channels were deleted externally — clean up */
        await Setup.deleteOne({ Guild: guildId });
        await AutoReconnect.deleteOne({ Guild: guildId });
      }

      await interaction.deferReply();

      const botId = client.user.id;
      const everyoneId = interaction.guild.id;

      /* ── Create Voice Channel ──────────────────── */
      let voiceChannel;
      try {
        voiceChannel = await interaction.guild.channels.create({
          name: "Aevix Music",
          type: ChannelType.GuildVoice,
          permissionOverwrites: [
            {
              id: everyoneId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
              ],
            },
            {
              id: botId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.Speak,
                PermissionsBitField.Flags.MuteMembers,
                PermissionsBitField.Flags.MoveMembers,
              ],
            },
          ],
          reason: "Aevix: Music setup — voice channel",
        });
      } catch (err) {
        return interaction.editReply(C.v2(
          C.fail(`Failed to create voice channel: ${err.message}`)
        ));
      }

      /* ── Create Text Channel ───────────────────── */
      let textChannel;
      try {
        textChannel = await interaction.guild.channels.create({
          name: "aevix-requests",
          type: ChannelType.GuildText,
          topic: `${MARK} Aevix Music · Type a song name or URL to play · 🔊 ${voiceChannel.name}`,
          permissionOverwrites: [
            {
              id: everyoneId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
              deny: [
                PermissionsBitField.Flags.AddReactions,
                PermissionsBitField.Flags.CreatePublicThreads,
                PermissionsBitField.Flags.CreatePrivateThreads,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.UseExternalEmojis,
              ],
            },
            {
              id: botId,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            },
          ],
          reason: "Aevix: Music setup — text channel",
        });
      } catch (err) {
        /* Clean up voice channel if text creation fails */
        await voiceChannel.delete().catch(() => null);
        return interaction.editReply(C.v2(
          C.fail(`Failed to create text channel: ${err.message}`)
        ));
      }

      /* ── Build Panel Message ───────────────────── */
      const panel = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Aevix Music`))
        .addSeparatorComponents(C.separator())
        .addSectionComponents(
          C.section(
            `Welcome to the **Aevix** music request channel.\n` +
            `Join 🔊 **${voiceChannel.name}** and type a song name or URL below.\n\n` +
            `**Supported Sources**\n` +
            `${e.dot} YouTube · YouTube Music · Spotify\n` +
            `${e.dot} SoundCloud · Apple Music · Deezer`,
            client.user.displayAvatarURL({ size: 256 })
          )
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**How to Use**\n` +
          `${e.dot} Type a **song name** or paste a **URL**\n` +
          `${e.dot} Your message is auto-deleted\n` +
          `${e.dot} Track is added to the queue\n` +
          `${e.dot} Use the buttons below for controls`
        ))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(
            C.btn.secondary("setup_pause", null, "⏸️"),
            C.btn.secondary("setup_skip", null, "⏭️"),
            C.btn.danger("setup_stop", null, "⏹️"),
            C.btn.secondary("setup_loop", null, "🔁"),
            C.btn.secondary("setup_shuffle", null, "🔀"),
          )
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(
          C.text(`-# ${MARK} 🔊 ${voiceChannel.name} · Type a song name to play`)
        );

      let panelMsg;
      try {
        panelMsg = await textChannel.send(C.v2(panel));
      } catch (err) {
        await textChannel.delete().catch(() => null);
        await voiceChannel.delete().catch(() => null);
        return interaction.editReply(C.v2(
          C.fail(`Failed to send panel: ${err.message}`)
        ));
      }

      /* ── Save to DB ────────────────────────────── */
      await Setup.findOneAndUpdate(
        { Guild: guildId },
        {
          Guild: guildId,
          Channel: textChannel.id,
          Message: panelMsg.id,
          voiceChannel: voiceChannel.id,
        },
        { upsert: true }
      );

      /* ── Create 24/7 entry (bot stays in VC) ──── */
      await AutoReconnect.findOneAndUpdate(
        { Guild: guildId },
        {
          Guild: guildId,
          TextId: textChannel.id,
          VoiceId: voiceChannel.id,
        },
        { upsert: true }
      );

      /* ── Create player and join VC ─────────────── */
      try {
        const player = await client.manager.createPlayer({
          guildId,
          voiceId: voiceChannel.id,
          textId: textChannel.id,
          deaf: true,
          volume: 80,
        });
        if (client.voiceHealthMonitor) client.voiceHealthMonitor.startMonitoring(player);
      } catch (err) {
        client.logger.log(`[Setup] Failed to create player: ${err.message}`, "warn");
      }

      /* ── Confirm ───────────────────────────────── */
      const container = C.container(COLORS.success)
        .addTextDisplayComponents(C.text(`### ${MARK}  Setup Complete`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Text Channel** · ${textChannel}\n` +
          `${e.dot} **Voice Channel** · ${voiceChannel}\n` +
          `${e.dot} **24/7 Mode** · Enabled (bot stays connected)\n\n` +
          `**How it works:**\n` +
          `${e.dot} Join 🔊 **${voiceChannel.name}**\n` +
          `${e.dot} Type a song name in ${textChannel}\n` +
          `${e.dot} Messages auto-delete, tracks auto-queue\n` +
          `${e.dot} Use panel buttons to control playback`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      await interaction.editReply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  DELETE
     * ═══════════════════════════════════════════════ */
    if (sub === "delete") {
      const existing = await Setup.findOne({ Guild: guildId });
      if (!existing)
        return interaction.reply(C.v2(C.fail("No setup channel configured.")));

      await interaction.deferReply();

      /* ── Destroy player ────────────────────────── */
      const player = client.manager?.players?.get(guildId);
      if (player) {
        if (client.voiceHealthMonitor) client.voiceHealthMonitor.stopMonitoring(guildId);
        client.rest.put(`/channels/${player.voiceId}/voice-status`, { body: { status: "" } }).catch(() => null);
        await player.destroy().catch(() => null);
      }

      /* ── Remove 24/7 entry ─────────────────────── */
      await AutoReconnect.deleteOne({ Guild: guildId });

      /* ── Delete channels ───────────────────────── */
      const textCh = interaction.guild.channels.cache.get(existing.Channel);
      const voiceCh = interaction.guild.channels.cache.get(existing.voiceChannel);

      if (textCh) await textCh.delete("Aevix: Setup deleted").catch(() => null);
      if (voiceCh) await voiceCh.delete("Aevix: Setup deleted").catch(() => null);

      /* ── Remove DB entry ───────────────────────── */
      await Setup.deleteOne({ Guild: guildId });

      await interaction.editReply(C.v2(
        C.ok(
          `Setup has been **removed**.\n` +
          `${e.dot} Text channel deleted\n` +
          `${e.dot} Voice channel deleted\n` +
          `${e.dot} 24/7 mode disabled`
        )
      ));
    }

    /* ═══════════════════════════════════════════════
     *  STATUS
     * ═══════════════════════════════════════════════ */
    if (sub === "status") {
      const existing = await Setup.findOne({ Guild: guildId });

      if (!existing) {
        return interaction.reply(C.v2(
          C.container(COLORS.brand)
            .addTextDisplayComponents(C.text(`### ${MARK}  Setup — Not Configured`))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(
              `No music request channel has been set up.\nUse \`/setup create\` to create one.`
            ))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(FOOTER))
        ));
      }

      const textCh = interaction.guild.channels.cache.get(existing.Channel);
      const voiceCh = interaction.guild.channels.cache.get(existing.voiceChannel);
      const player = client.manager?.players?.get(guildId);
      const is247 = await AutoReconnect.findOne({ Guild: guildId });

      const textStr = textCh ? `${textCh}` : `\`${existing.Channel}\` *(deleted)*`;
      const voiceStr = voiceCh ? `${voiceCh}` : `\`${existing.voiceChannel || "none"}\` *(deleted)*`;
      const playerStr = player?.playing
        ? `${e.tick} Playing — **${player.queue.current?.title || "Unknown"}**`
        : player
          ? `${e.tick} Connected (idle)`
          : `${e.cross} Disconnected`;

      const panelLink = textCh
        ? `[Jump to Panel](https://discord.com/channels/${guildId}/${existing.Channel}/${existing.Message})`
        : "Unavailable";

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Setup — Status`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Text Channel** · ${textStr}\n` +
          `${e.dot} **Voice Channel** · ${voiceStr}\n` +
          `${e.dot} **Panel** · ${panelLink}\n` +
          `${e.dot} **Player** · ${playerStr}\n` +
          `${e.dot} **24/7** · ${is247 ? `${e.tick} Enabled` : `${e.cross} Disabled`}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      await interaction.reply(C.v2(container));
    }
  },
};