/** @format */

const { ChannelType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

const VERIFICATION = { 0: "None", 1: "Low", 2: "Medium", 3: "High", 4: "Very High" };
const BOOST_TIER = { 0: "None", 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };
const FILTER_LEVEL = { 0: "Disabled", 1: "Members without roles", 2: "All members" };

module.exports = {
  name: "serverinfo",
  aliases: ["si", "guild", "guildinfo"],
  category: "Utility",
  description: "View detailed server information",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const guild = message.guild;

    await guild.members.fetch({ limit: 500 }).catch(() => null);

    const createdTs = Math.round(guild.createdTimestamp / 1000);
    const owner = await guild.fetchOwner().catch(() => null);

    /* ── Channel breakdown ───────────────────────── */
    const ch = guild.channels.cache;
    const text = ch.filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement).size;
    const voice = ch.filter((c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).size;
    const categories = ch.filter((c) => c.type === ChannelType.GuildCategory).size;
    const threads = ch.filter((c) => c.isThread()).size;
    const forums = ch.filter((c) => c.type === ChannelType.GuildForum).size;

    /* ── Member breakdown ────────────────────────── */
    const total = guild.memberCount;
    const cached = guild.members.cache;
    const bots = cached.filter((m) => m.user.bot).size;
    const humans = total - bots;
    const online = cached.filter((m) => m.presence?.status === "online").size;
    const idle = cached.filter((m) => m.presence?.status === "idle").size;
    const dnd = cached.filter((m) => m.presence?.status === "dnd").size;

    /* ── Vanity & Features ───────────────────────── */
    const vanity = guild.vanityURLCode ? `[discord.gg/${guild.vanityURLCode}](https://discord.gg/${guild.vanityURLCode})` : "None";
    const features = guild.features.length
      ? guild.features.slice(0, 8).map((f) => `\`${f.toLowerCase().replace(/_/g, " ")}\``).join(", ")
        + (guild.features.length > 8 ? ` +${guild.features.length - 8} more` : "")
      : "None";

    /* ── Emojis & Stickers ───────────────────────── */
    const animated = guild.emojis.cache.filter((e) => e.animated).size;
    const staticEmoji = guild.emojis.cache.size - animated;
    const stickers = guild.stickers.cache.size;

    const general =
      `${e.dot} **Owner** · ${owner ? `${owner.user}` : "Unknown"}\n` +
      `${e.dot} **Created** · <t:${createdTs}:f> (<t:${createdTs}:R>)\n` +
      `${e.dot} **ID** · \`${guild.id}\`\n` +
      `${e.dot} **Vanity** · ${vanity}`;

    const members =
      `${e.dot} **Total** · \`${total.toLocaleString()}\` (Humans: \`${humans}\` · Bots: \`${bots}\`)\n` +
      `${e.dot} **Online** · 🟢 \`${online}\` · 🟡 \`${idle}\` · 🔴 \`${dnd}\``;

    const channels =
      `${e.dot} **Text** · \`${text}\` · **Voice** · \`${voice}\` · **Categories** · \`${categories}\`\n` +
      `${e.dot} **Threads** · \`${threads}\` · **Forums** · \`${forums}\`\n` +
      `${e.dot} **Total** · \`${ch.size}\``;

    const boostInfo =
      `${e.dot} **Tier** · ${BOOST_TIER[guild.premiumTier] || "None"}\n` +
      `${e.dot} **Boosts** · \`${guild.premiumSubscriptionCount || 0}\`\n` +
      `${e.dot} **Boosters** · \`${cached.filter((m) => m.premiumSince).size}\``;

    const extras =
      `${e.dot} **Roles** · \`${guild.roles.cache.size}\`\n` +
      `${e.dot} **Emojis** · \`${staticEmoji}\` static · \`${animated}\` animated\n` +
      `${e.dot} **Stickers** · \`${stickers}\`\n` +
      `${e.dot} **Verification** · ${VERIFICATION[guild.verificationLevel] || "Unknown"}\n` +
      `${e.dot} **Content Filter** · ${FILTER_LEVEL[guild.explicitContentFilter] || "Unknown"}\n` +
      `${e.dot} **Features** · ${features}`;

    const icon = guild.iconURL({ size: 256 });
    const banner = guild.bannerURL({ size: 1024 });

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  ${guild.name}`))
      .addSeparatorComponents(C.separator());

    if (icon) {
      container.addSectionComponents(C.section(`**General**\n${general}`, icon));
    } else {
      container.addTextDisplayComponents(C.text(`**General**\n${general}`));
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`**Members**\n${members}`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`**Channels**\n${channels}`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`**Boost**\n${boostInfo}`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`**Extras**\n${extras}`));

    if (banner) {
      container.addSeparatorComponents(C.separator())
        .addMediaGalleryComponents(C.gallery(banner));
    }

    container.addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};