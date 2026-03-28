/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /warn
 *  Issues a warning with auto-escalation tier support.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Warn = require("../../schema/warn");
const WarnConfig = require("../../schema/warnconfig");
const Components = require("../../custom/components");
const { formatDuration } = require("../../utils/convert");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "warn",
  description: "Issue a warning to a member",
  botPerms: ["ModerateMembers"],
  userPerms: ["ModerateMembers"],
  default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
  options: [
    {
      name: "user",
      description: "The member to warn",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the warning",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (user.bot)
      return interaction.reply(C.v2(C.fail("You cannot warn a **bot**.")));
    if (user.id === interaction.user.id)
      return interaction.reply(C.v2(C.fail("You cannot warn yourself.")));

    const member = interaction.guild.members.cache.get(user.id)
      || await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member)
      return interaction.reply(C.v2(C.fail("That user is **not in this server**.")));
    if (
      member.roles.highest.position >= interaction.member.roles.highest.position &&
      interaction.user.id !== interaction.guild.ownerId
    )
      return interaction.reply(C.v2(C.fail("That user has a **higher or equal role** than you.")));

    await interaction.deferReply();

    /* ── Create warning ──────────────────────────── */
    const warnId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await Warn.create({
      guildId: interaction.guild.id,
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      warnId,
    });

    const totalWarns = await Warn.countDocuments({
      guildId: interaction.guild.id,
      userId: user.id,
    });

    /* ── Auto-escalation ─────────────────────────── */
    let escalation = null;
    const config = await WarnConfig.findOne({ guildId: interaction.guild.id });

    if (config?.tiers?.length) {
      const sorted = [...config.tiers].sort((a, b) => b.count - a.count);
      const tier = sorted.find((t) => totalWarns >= t.count);

      if (tier) {
        try {
          switch (tier.action) {
            case "mute": {
              const duration = tier.duration ? tier.duration * 60_000 : 3_600_000;
              if (member.moderatable) {
                await member.timeout(duration, `Aevix: Warn tier escalation (${totalWarns} warnings)`);
                escalation = `Timed out for **${formatDuration(duration)}**`;
              }
              break;
            }
            case "kick":
              if (member.kickable) {
                await member.kick(`Aevix: Warn tier escalation (${totalWarns} warnings)`);
                escalation = "**Kicked** from server";
              }
              break;
            case "ban":
              if (member.bannable) {
                await interaction.guild.members.ban(user.id, {
                  reason: `Aevix: Warn tier escalation (${totalWarns} warnings)`,
                });
                escalation = "**Banned** from server";
              }
              break;
          }
        } catch {}
      }
    }

    /* ── DM notification ─────────────────────────── */
    if (!config || config.dmOnWarn !== false) {
      try {
        const dmLines = [
          `${e.dot} **Server** · ${interaction.guild.name}`,
          `${e.dot} **Reason** · ${reason}`,
          `${e.dot} **Warnings** · \`${totalWarns}\``,
          `${e.dot} **Moderator** · ${interaction.user.displayName}`,
        ];
        if (escalation) dmLines.push(`\n⚠️ **Escalation:** ${escalation}`);

        const dm = C.container(COLORS.warn)
          .addTextDisplayComponents(C.text(`### ${MARK}  You've been Warned`))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(dmLines.join("\n")))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(FOOTER));
        await user.send(C.v2(dm)).catch(() => null);
      } catch {}
    }

    /* ── Log channel ─────────────────────────────── */
    if (config?.logChannelId) {
      const logCh = interaction.guild.channels.cache.get(config.logChannelId);
      if (logCh) {
        const log = C.container(COLORS.warn)
          .addTextDisplayComponents(C.text(`### ${MARK}  Warning Issued`))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(
            `${e.dot} **Target** · ${user.tag} (\`${user.id}\`)\n` +
            `${e.dot} **Reason** · ${reason}\n` +
            `${e.dot} **Total Warnings** · \`${totalWarns}\`\n` +
            `${e.dot} **Warn ID** · \`${warnId}\`\n` +
            `${e.dot} **Moderator** · ${interaction.user.tag}` +
            (escalation ? `\n${e.dot} **Escalation** · ${escalation}` : "")
          ))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(FOOTER));
        logCh.send(C.v2(log)).catch(() => null);
      }
    }

    /* ── Response ────────────────────────────────── */
    const body = [
      `${e.dot} **Target** · ${user.tag} (\`${user.id}\`)`,
      `${e.dot} **Reason** · ${reason}`,
      `${e.dot} **Total Warnings** · \`${totalWarns}\``,
      `${e.dot} **Warn ID** · \`${warnId}\``,
      `${e.dot} **Moderator** · ${interaction.user.displayName}`,
    ];
    if (escalation) body.push(`\n⚠️ **Auto-Escalation:** ${escalation}`);

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### ${MARK}  Warning Issued`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(body.join("\n")))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};