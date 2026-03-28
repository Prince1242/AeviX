/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Guild Delete (Left Server)
 *
 *  FIX: Added Roles, Afk, WelcomeSystem cleanup.
 *  Uses Promise.allSettled for non-blocking cleanup.
 * ══════════════════════════════════════════════════════════════════════ */

const { WebhookClient } = require("discord.js");
const mongoose = require("mongoose");
const {
  Webhooks: { guild_leave },
} = require("../../config.js");
const moment = require("moment");
const { MARK, COLORS: BRAND_COLORS } = require("../../custom/components");

/* All guild-scoped schemas */
const VoiceRole = require("../../schema/voicerole");
const AntiSpam = require("../../schema/antispam");
const AntiLink = require("../../schema/antilink");
const AutoResp = require("../../schema/ar");
const AutoRole = require("../../schema/autorole");
const AntiNuke = require("../../schema/antinuke");
const AutoReconnect = require("../../schema/247");
const Prefix = require("../../schema/prefix");
const Setup = require("../../schema/setup");
const Preset = require("../../schema/preset");
const VcStatus = require("../../schema/vcstatus");
const IgnoreChannel = require("../../schema/ignorechannel");
const AutoReact = require("../../schema/autoreact");
const Roles = require("../../schema/roles");
const Afk = require("../../schema/afk");

/* Ensure WelcomeSystem model is registered (side-effect import) */
require("../../schema/welcomesystem");

module.exports = {
  name: "guildDelete",
  run: async (client, guild) => {
    try {
      /* ── Clean up ALL guild data ───────────────── */
      const guildId = guild.id;

      /* Build cleanup promises — allSettled ensures one failure
       * doesn't block the rest */
      const cleanups = [
        VoiceRole.deleteMany({ guildId }),
        AntiLink.deleteMany({ guildId }),
        AntiSpam.deleteMany({ guildId }),
        AutoResp.deleteMany({ guildId }),
        AutoRole.deleteMany({ guildId }),
        AntiNuke.deleteMany({ guildId }),
        AutoReconnect.deleteMany({ Guild: guildId }),
        Prefix.deleteMany({ Guild: guildId }),
        Setup.deleteMany({ Guild: guildId }),
        Preset.deleteMany({ guildId }),
        VcStatus.deleteMany({ guildId }),
        IgnoreChannel.deleteMany({ guildId }),
        AutoReact.deleteMany({ guildId }),
        Roles.deleteMany({ guildId }),
        Afk.deleteMany({ Guild: guildId }),
      ];

      /* FIX: Clean WelcomeSystem guild data (model name: "guild", keyed by _id) */
      const GuildModel = mongoose.models.guild;
      if (GuildModel) {
        cleanups.push(GuildModel.deleteOne({ _id: guildId }));
      }

      await Promise.allSettled(cleanups);

      /* ── Stop voice monitoring if active ───────── */
      if (client.voiceHealthMonitor) {
        client.voiceHealthMonitor.stopMonitoring(guildId);
      }

      /* ── Destroy player if active ──────────────── */
      const player = client.manager?.players?.get(guildId);
      if (player) {
        await player.destroy().catch(() => null);
      }

      /* ── Webhook log ───────────────────────────── */
      const web = new WebhookClient({ url: guild_leave });
      const owner = await guild?.fetchOwner().catch(() => null);

      const embed = new client.embed()
        .c(BRAND_COLORS.error)
        .thumb(guild.iconURL({ size: 1024 }))
        .t(`${MARK} Left a Guild`)
        .addFields([
          { name: "Name", value: `\`${guild.name}\``, inline: true },
          { name: "ID", value: `\`${guild.id}\``, inline: true },
          {
            name: "Owner",
            value: `\`${owner?.user?.tag || "Unknown"}\` (${owner?.id || "N/A"})`,
          },
          {
            name: "Members",
            value: `\`${guild.memberCount}\``,
            inline: true,
          },
          {
            name: "Created",
            value: `\`${moment.utc(guild.createdAt).format("DD/MMM/YYYY")}\``,
            inline: true,
          },
          {
            name: "Total Servers",
            value: `\`${client.guilds.cache.size}\``,
            inline: true,
          },
        ])
        .f(`${MARK} Aevix · ${client.guilds.cache.size} servers`, client.user.displayAvatarURL())
        .ts();

      web.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
      client.logger.log(`[GuildDelete] Error: ${error.message}`, "error");
    }
  },
};