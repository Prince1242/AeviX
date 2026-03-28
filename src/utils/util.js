/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — General Utilities
 *
 *  Welcome system, purge, text parsing, emojify.
 * ══════════════════════════════════════════════════════════════════ */

const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("../schema/welcomesystem");

/* Regional indicator letters — local only, not in global emoji map */
const LETTER_EMOJIS = {
  a:"🇦",b:"🇧",c:"🇨",d:"🇩",e:"🇪",f:"🇫",g:"🇬",h:"🇭",i:"🇮",
  j:"🇯",k:"🇰",l:"🇱",m:"🇲",n:"🇳",o:"🇴",p:"🇵",q:"🇶",r:"🇷",
  s:"🇸",t:"🇹",u:"🇺",v:"🇻",w:"🇼",x:"🇽",y:"🇾",z:"🇿",
};

module.exports = class Util {
  constructor(client) {
    this.client = client;
  }

  /* ── Text Utilities ────────────────────────────── */

  emojify(content) {
    return content.toLowerCase().split("")
      .map((ch) => LETTER_EMOJIS[ch] || ch)
      .join("");
  }

  /* ── Welcome System ────────────────────────────── */

  async sendPreview(settings, member) {
    if (!settings.welcome?.enabled) return "Welcome message not enabled in this server.";
    const ch = member.guild.channels.cache.get(settings.welcome.channel);
    if (!ch) return "No channel is configured for welcome messages.";
    const response = await this.buildGreeting(member, "WELCOME", settings.welcome);
    await this.sendMessage(ch, response, settings.welcome.autodel);
    return `Sent welcome preview to ${ch.toString()}`;
  }

  async setStatus(settings, status) {
    const enabled = status.toUpperCase() === "ON";
    settings.welcome.enabled = enabled;
    await settings.save();
    return `Welcome message ${enabled ? "**enabled**" : "**disabled**"}.`;
  }

  async setChannel(settings, channel) {
    if (!this.canSendEmbeds(channel))
      return "I cannot send messages to that channel. I need `Send Messages` and `Embed Links` permissions in " + channel.toString();
    settings.welcome.channel = channel.id;
    await settings.save();
    return `Welcome messages will be sent to ${channel.toString()}.`;
  }

  async setDescription(s, d) { s.welcome.embed.description = d; await s.save(); return "Welcome message updated."; }
  async setFooter(s, f) { s.welcome.embed.footer = f; await s.save(); return "Welcome message updated."; }
  async setTitle(s, t) { s.welcome.embed.title = t; await s.save(); return "Welcome message updated."; }
  async setImage(s, i) { s.welcome.embed.image = i; await s.save(); return "Welcome message updated."; }
  async setThumbnail(s, t) { s.welcome.embed.thumbnail = t; await s.save(); return "Welcome message updated."; }

  /* ── Permission Checks ─────────────────────────── */

  canSendEmbeds(channel) {
    const me = channel.guild.members.me;
    return me && channel.permissionsFor(me).has(["SendMessages", "EmbedLinks"]);
  }

  /* ── Greeting Builder ──────────────────────────── */

  async buildGreeting(member, type, config) {
    if (!config) return null;
    const content = config.content ? await this.parse(config.content, member) : `<@${member.user.id}>`;
    const embed = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.displayAvatarURL() })
      .setTimestamp()
      .setColor(config.embed?.color || this.client.color);

    if (config.embed?.description) embed.setDescription(await this.parse(config.embed.description, member));
    if (config.embed?.thumbnail && config.embed.thumbnail !== "false") {
      const url = await this.parseDynamicURL(config.embed.thumbnail, member);
      if (this.isValidURL(url)) embed.setThumbnail(url);
    }
    if (config.embed?.title) embed.setTitle(await this.parse(config.embed.title, member));
    if (config.embed?.image && config.embed.image !== "false") {
      const url = await this.parseDynamicURL(config.embed.image, member);
      if (this.isValidURL(url)) embed.setImage(url);
    }
    if (config.embed?.footer) {
      const f = await this.parse(config.embed.footer, member);
      embed.setFooter(typeof f === "string" ? { text: f } : f);
    }

    if (!config.content && !config.embed?.description && !config.embed?.footer) {
      return {
        content: `<@${member.user.id}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(this.client.color)
            .setTitle("Welcome")
            .setDescription(`Welcome to **${member.guild.name}**!\nPlease check the rules and enjoy your stay.`)
            .setFooter({ text: `Members: ${member.guild.memberCount}`, iconURL: member.guild.iconURL() }),
        ],
      };
    }
    return { content, embeds: [embed] };
  }

  /* ── Message Sender ────────────────────────────── */

  async sendMessage(channel, content, seconds) {
    if (!channel || !content) return;
    const perms = ["ViewChannel", "SendMessages"];
    if (content.embeds?.length) perms.push("EmbedLinks");
    const me = channel.guild.members.me;
    if (!me || !channel.permissionsFor(me).has(perms)) return;
    try {
      const message = await channel.send(content);
      if (seconds > 0) setTimeout(() => message.deletable && message.delete().catch(() => {}), seconds * 1000);
    } catch {}
  }

  /* ── Welcome Handler ───────────────────────────── */

  async sendWelcome(member) {
    const config = (await getSettings(member.guild))?.welcome;
    if (!config?.enabled) return;
    const channel = member.guild.channels.cache.get(config.channel);
    if (!channel) return;
    const response = await this.buildGreeting(member, "WELCOME", config);
    if (response) this.sendMessage(channel, response, config.autodel);
  }

  /* ── Template Parsing ──────────────────────────── */

  async parse(content, member) {
    const guild = member.guild, user = member.user;
    return content
      .replaceAll(/\\n/g, "\n")
      .replaceAll(/{server_name}/g, guild.name)
      .replaceAll(/{server_id}/g, guild.id)
      .replaceAll(/{server_icon}/g, guild.iconURL({ dynamic: true }) || "")
      .replaceAll(/{server_ownerId}/g, guild.ownerId)
      .replaceAll(/{server_owner}/g, `<@${guild.ownerId}>`)
      .replaceAll(/{server_memberCount}/g, String(guild.memberCount))
      .replaceAll(/{user_display}/g, member.displayName)
      .replaceAll(/{user_avatar}/g, user.displayAvatarURL({ dynamic: true }))
      .replaceAll(/{user_name}/g, user.username)
      .replaceAll(/{user}/g, `<@${user.id}>`)
      .replaceAll(/{user_id}/g, user.id)
      .replaceAll(/{user_created:at}/g, `<t:${Math.round(user.createdTimestamp / 1000)}:R>`);
  }

  async parseDynamicURL(url, member) {
    return url
      .replaceAll(/{server_icon}/g, member.guild.iconURL({ dynamic: true }) || "")
      .replaceAll(/{user_icon}/g, member.user.displayAvatarURL({ dynamic: true }));
  }

  isValidURL(url) { try { return Boolean(new URL(url)); } catch { return false; } }
  isHex(color) { return /^#[0-9A-Fa-f]{6}$/i.test(color); }

  /* ── Purge Utility ─────────────────────────────── */

  async purgeMessages(issuer, channel, type, amount, argument) {
    const perms = ["ManageMessages", "ReadMessageHistory"];
    if (!channel.permissionsFor(issuer).has(perms)) return "MemberPerm";
    if (!channel.permissionsFor(channel.guild.members.me).has(perms)) return "BotPerms";
    try {
      const messages = await channel.messages.fetch({ limit: Math.min(amount, 100) });
      const filters = {
        ALL: () => true,
        ATTACHMENT: (m) => m.attachments.size > 0,
        BOT: (m) => m.author.bot,
        LINK: (m) => /https?:\/\/|discord\.gg\//gi.test(m.content),
        TOKEN: (m) => m.content.includes(argument),
        USER: (m) => m.author.id === argument,
      };
      const filter = filters[type];
      if (!filter) return "NO_MESSAGES";
      const toDelete = messages.filter((m) => m.deletable && filter(m));
      if (toDelete.size === 0) return "NO_MESSAGES";
      return (await channel.bulkDelete(toDelete, true)).size;
    } catch { return "ERROR"; }
  }
};