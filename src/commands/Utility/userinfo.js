/** @format */

const { PermissionsBitField } = require("discord.js");
const Components = require("../../custom/components");
const Badge = require("../../schema/badge");

const { MARK, FOOTER, COLORS } = Components;

const DISCORD_BADGES = {
  Staff: "<:staff:1234> Staff", Partner: "Partner", Hypesquad: "HypeSquad",
  BugHunterLevel1: "Bug Hunter", BugHunterLevel2: "Bug Hunter Gold",
  HypeSquadOnlineHouse1: "Bravery", HypeSquadOnlineHouse2: "Brilliance",
  HypeSquadOnlineHouse3: "Balance", PremiumEarlySupporter: "Early Supporter",
  VerifiedDeveloper: "Verified Dev", CertifiedModerator: "Certified Mod",
  ActiveDeveloper: "Active Dev",
};

const KEY_PERMS = [
  "Administrator", "ManageGuild", "ManageRoles", "ManageChannels",
  "ManageMessages", "BanMembers", "KickMembers", "ModerateMembers",
  "MentionEveryone", "ManageWebhooks", "ManageNicknames",
];

module.exports = {
  name: "userinfo",
  aliases: ["ui", "whois", "user"],
  category: "Utility",
  description: "View detailed user information",
  usage: "[@user|id]",
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const targetUser = message.mentions.users.first()
      || (args[0] ? await client.users.fetch(args[0].replace(/[<@!>]/g, "")).catch(() => null) : null)
      || message.author;

    /* Force fetch for banner/accent color */
    const fetched = await client.users.fetch(targetUser.id, { force: true });
    const member = message.guild.members.cache.get(targetUser.id)
      || await message.guild.members.fetch(targetUser.id).catch(() => null);

    const createdTs = Math.round(targetUser.createdTimestamp / 1000);

    /* ── Discord Badges ──────────────────────────── */
    const flags = fetched.flags?.toArray() || [];
    const discordBadges = flags.map((f) => DISCORD_BADGES[f]).filter(Boolean);

    /* ── Aevix Badges ────────────────────────────── */
    const badgeData = await Badge.findOne({ userId: targetUser.id });
    const aevixBadges = [];
    if (badgeData?.badge) {
      for (const [key, val] of Object.entries(badgeData.badge)) {
        if (val) aevixBadges.push(key.charAt(0).toUpperCase() + key.slice(1));
      }
    }

    /* ── Build info ──────────────────────────────── */
    const lines = [
      `**${fetched.displayName}**`,
      `\`@${fetched.username}\` · \`${fetched.id}\``,
      `${fetched.bot ? "🤖 Bot" : "👤 Human"}`,
      "",
      `${e.dot} **Created** · <t:${createdTs}:f> (<t:${createdTs}:R>)`,
    ];

    if (member) {
      const joinedTs = Math.round(member.joinedTimestamp / 1000);
      lines.push(`${e.dot} **Joined** · <t:${joinedTs}:f> (<t:${joinedTs}:R>)`);

      /* Join position */
      const sorted = [...message.guild.members.cache.values()]
        .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
      const joinPos = sorted.findIndex((m) => m.id === targetUser.id) + 1;
      if (joinPos > 0) lines.push(`${e.dot} **Join Position** · #${joinPos}`);

      /* Roles */
      const roles = member.roles.cache
        .filter((r) => r.id !== message.guild.id)
        .sort((a, b) => b.position - a.position);

      if (roles.size > 0) {
        const display = roles.first(10).map((r) => `${r}`).join(", ");
        const extra = roles.size > 10 ? ` +${roles.size - 10} more` : "";
        lines.push(`${e.dot} **Roles** [${roles.size}] · ${display}${extra}`);
      }

      /* Highest role color */
      if (member.displayHexColor !== "#000000") {
        lines.push(`${e.dot} **Color** · \`${member.displayHexColor}\``);
      }

      /* Boost */
      if (member.premiumSince) {
        const boostTs = Math.round(member.premiumSinceTimestamp / 1000);
        lines.push(`${e.dot} **Boosting** · <t:${boostTs}:R>`);
      }

      /* Key Permissions */
      const perms = KEY_PERMS.filter((p) => member.permissions.has(PermissionsBitField.Flags[p]));
      if (perms.length) {
        lines.push(`${e.dot} **Key Perms** · ${perms.map((p) => `\`${p}\``).join(", ")}`);
      }

      /* Voice state */
      if (member.voice?.channel) {
        const vc = member.voice;
        const status = [];
        if (vc.selfMute) status.push("Muted");
        if (vc.selfDeaf) status.push("Deafened");
        if (vc.streaming) status.push("Streaming");
        if (vc.selfVideo) status.push("Camera");
        lines.push(`${e.dot} **Voice** · ${vc.channel} ${status.length ? `(${status.join(", ")})` : ""}`);
      }
    }

    /* Badges */
    if (discordBadges.length) lines.push(`\n${e.dot} **Discord Badges** · ${discordBadges.join(", ")}`);
    if (aevixBadges.length) lines.push(`${e.dot} **Aevix Badges** · ${aevixBadges.join(", ")}`);
    if (badgeData?.blacklisted) lines.push(`${e.cross} **Blacklisted**`);

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  User Info`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(
        C.section(lines.join("\n"), targetUser.displayAvatarURL({ size: 256 }))
      );

    /* Banner if available */
    const bannerUrl = fetched.bannerURL({ size: 1024 });
    if (bannerUrl) {
      container
        .addSeparatorComponents(C.separator())
        .addMediaGalleryComponents(C.gallery(bannerUrl));
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};