/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /serverinfo
 * ══════════════════════════════════════════════════════════════════ */

const { ChannelType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

const VERIFICATION = { 0: "None", 1: "Low", 2: "Medium", 3: "High", 4: "Very High" };
const BOOST_TIER = { 0: "None", 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };

module.exports = {
  name: "serverinfo",
  description: "View information about this server",

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const guild = interaction.guild;

    const createdTs = Math.round(guild.createdTimestamp / 1000);
    const owner = await guild.fetchOwner().catch(() => null);

    /* ── Channel counts ──────────────────────────── */
    const ch = guild.channels.cache;
    const text = ch.filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement).size;
    const voice = ch.filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).size;
    const categories = ch.filter((c) => c.type === ChannelType.GuildCategory).size;

    /* ── Member counts ───────────────────────────── */
    const total = guild.memberCount;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const humans = total - bots;

    /* ── Vanity ──────────────────────────────────── */
    const vanity = guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : "None";

    const info =
      `${e.dot} **Owner** · ${owner ? `${owner.user}` : "Unknown"}\n` +
      `${e.dot} **Created** · <t:${createdTs}:R>\n` +
      `${e.dot} **ID** · \`${guild.id}\`\n\n` +
      `${e.dot} **Members** · \`${total.toLocaleString()}\` ` +
        `(Humans: \`${humans}\` · Bots: \`${bots}\`)\n` +
      `${e.dot} **Channels** · Text: \`${text}\` · Voice: \`${voice}\` · Categories: \`${categories}\`\n` +
      `${e.dot} **Roles** · \`${guild.roles.cache.size}\`\n\n` +
      `${e.dot} **Boost** · ${BOOST_TIER[guild.premiumTier] || "None"} (\`${guild.premiumSubscriptionCount || 0}\` boosts)\n` +
      `${e.dot} **Verification** · ${VERIFICATION[guild.verificationLevel] || "Unknown"}\n` +
      `${e.dot} **Vanity** · \`${vanity}\``;

    const icon = guild.iconURL({ size: 256 });
    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  ${guild.name}`))
      .addSeparatorComponents(C.separator());

    if (icon) {
      container.addSectionComponents(C.section(info, icon));
    } else {
      container.addTextDisplayComponents(C.text(info));
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.reply(C.v2(container));
  },
};