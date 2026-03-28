/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /userinfo
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

/* ── Badge Map ───────────────────────────────────── */
const BADGES = {
  Staff: "Discord Staff",
  Partner: "Partner",
  Hypesquad: "HypeSquad Events",
  BugHunterLevel1: "Bug Hunter",
  BugHunterLevel2: "Bug Hunter Gold",
  HypeSquadOnlineHouse1: "Bravery",
  HypeSquadOnlineHouse2: "Brilliance",
  HypeSquadOnlineHouse3: "Balance",
  PremiumEarlySupporter: "Early Supporter",
  VerifiedDeveloper: "Verified Bot Dev",
  CertifiedModerator: "Certified Mod",
  ActiveDeveloper: "Active Developer",
};

module.exports = {
  name: "userinfo",
  description: "View information about a user",
  options: [
    {
      name: "user",
      description: "Target user",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const member = interaction.guild.members.cache.get(targetUser.id)
      || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const createdTs = Math.round(targetUser.createdTimestamp / 1000);

    /* ── Badges ──────────────────────────────────── */
    const flags = targetUser.flags?.toArray() || [];
    const badgeList = flags.map((f) => BADGES[f]).filter(Boolean);
    const badgeStr = badgeList.length ? badgeList.join(", ") : "None";

    /* ── Build info lines ────────────────────────── */
    const lines = [
      `**${targetUser.displayName}**`,
      `\`@${targetUser.username}\` · \`${targetUser.id}\``,
      "",
      `${e.dot} **Created** · <t:${createdTs}:R>`,
    ];

    if (member) {
      const joinedTs = Math.round(member.joinedTimestamp / 1000);
      lines.push(`${e.dot} **Joined** · <t:${joinedTs}:R>`);

      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position);

      if (roles.size > 0) {
        const display = roles.first(8).map((r) => `${r}`).join(", ");
        const extra = roles.size > 8 ? ` +${roles.size - 8} more` : "";
        lines.push(`${e.dot} **Roles** [${roles.size}] · ${display}${extra}`);
      }

      if (member.premiumSince) {
        const boostTs = Math.round(member.premiumSinceTimestamp / 1000);
        lines.push(`${e.dot} **Boosting** · <t:${boostTs}:R>`);
      }
    }

    lines.push(`${e.dot} **Badges** · ${badgeStr}`);

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  User Info`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(
        C.section(lines.join("\n"), targetUser.displayAvatarURL({ size: 256 }))
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.reply(C.v2(container));
  },
};