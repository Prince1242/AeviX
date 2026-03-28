/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Message Create (Prefix Command Handler)
 *
 *  Resolves prefix, handles bot mention, permission checks,
 *  cooldowns, vote-gating, and command execution.
 * ══════════════════════════════════════════════════════════════════ */

const { PermissionsBitField, WebhookClient, EmbedBuilder } = require("discord.js");
const db = require("../../schema/prefix.js");
const bl = require("../../schema/blacklist");
const IgnoreChannelModel = require("../../schema/ignorechannel");
const db4 = require("../../schema/noprefix");
const { hasVoted, createVoteGateMessage } = require("../../utils/topgg");
const { replyTemp, FOOTER, ERROR_DELETE_MS } = require("../../utils/response");
const Components = require("../../custom/components");

const OWNER_IDS = ["971329961313046578"];
const cooldowns = new Map();

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;

    const C = client.components;

    /* ── Resolve prefix ──────────────────────────── */
    let prefix = client.prefix;
    const prefixDoc = await db.findOne({ Guild: message.guildId });
    if (prefixDoc?.Prefix) prefix = prefixDoc.Prefix;

    /* ── Bot mention response ────────────────────── */
    const mentionRegex = new RegExp(`^<@!?${client.user.id}>\\s*$`);
    if (mentionRegex.test(message.content)) {
      if (!message.guild.members.me.permissions.has("SendMessages")) return;

      const e = client.emoji;
      const container = C.container(Components.COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${Components.MARK}  Aevix`))
        .addSeparatorComponents(C.separator())
        .addSectionComponents(
          C.section(
            `Hey **${message.author.username}**!\n` +
            `My prefix is \`${prefix}\` · try \`${prefix}help\`\n\n` +
            `${e.dot} **${client.commands.size}** commands\n` +
            `${e.dot} **${client.guilds.cache.size}** servers`,
            client.user.displayAvatarURL({ size: 256 })
          )
        )
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(
            C.btn.link("Invite", client.config.links.invite),
            C.btn.link("Support", client.config.links.support),
            C.btn.link("Vote", client.config.links.topgg, e.premium),
          )
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(Components.FOOTER));

      return message.channel.send(C.v2(container)).catch(() => null);
    }

    /* ── Prefix & No-Prefix Resolution ──────────── */
    const npDoc = await db4.findOne({ userId: message.author.id, noprefix: true });
    const hasNoPrefix = !!npDoc;

    const mentionPrefixRegex = new RegExp(`^<@!?${client.user.id}>`);
    const mentionMatch = message.content.match(mentionPrefixRegex);
    const usedPrefix = mentionMatch ? mentionMatch[0] : prefix;
    const startsWithPrefix = message.content.startsWith(usedPrefix);

    if (!hasNoPrefix && !startsWithPrefix) return;

    const args = startsWithPrefix
      ? message.content.slice(usedPrefix.length).trim().split(/\s+/)
      : message.content.trim().split(/\s+/);

    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    /* ── Resolve command ─────────────────────────── */
    const command =
      client.commands.get(commandName) ||
      client.commands.get(client.aliases.get(commandName));
    if (!command) return;

    /* ── Blacklist ────────────────────────────────── */
    if (await bl.findOne({ userId: message.author.id })) {
      return replyTemp(message, C.fail("You are **blacklisted** from using this bot."), client, ERROR_DELETE_MS);
    }

    /* ── Maintenance ─────────────────────────────── */
    if (client.maintenance && !OWNER_IDS.includes(message.author.id)) {
      return replyTemp(message, C.caution(
        `**Aevix is under maintenance**\n${client.maintenanceReason || "We'll be back shortly."}`
      ), client, 8_000);
    }

    /* ── Ignore channel ──────────────────────────── */
    if (await IgnoreChannelModel.findOne({ guildId: message.guild.id, channelId: message.channel.id })) {
      if (!OWNER_IDS.includes(message.author.id)) {
        return replyTemp(message, C.caution("Commands are disabled in this channel."), client, 5_000);
      }
    }

    /* ── Cooldown ────────────────────────────────── */
    if (!OWNER_IDS.includes(message.author.id)) {
      if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Map());
      const timestamps = cooldowns.get(command.name);
      const cooldownMs = (command.cooldown || 3) * 1000;
      const now = Date.now();

      if (timestamps.has(message.author.id)) {
        const expiry = timestamps.get(message.author.id) + cooldownMs;
        if (now < expiry) {
          return replyTemp(message,
            C.caution(`Wait <t:${Math.round(expiry / 1000)}:R> before reusing \`${command.name}\``),
            client, Math.min(expiry - now, 10_000)
          );
        }
      }
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownMs);
    }

    /* ── Vote-only ───────────────────────────────── */
    if (command.voteonly && !(await hasVoted(client, message.author.id))) {
      return message.channel.send(createVoteGateMessage(client)).catch(() => null);
    }

    /* ── Permission checks ───────────────────────── */
    const me = message.guild.members.me;

    if (!me.permissions.has("SendMessages")) {
      return message.author.send(`I need **Send Messages** permission in **${message.guild.name}**.`).catch(() => null);
    }
    if (!me.permissions.has("ViewChannel")) return;
    if (!me.permissions.has("EmbedLinks")) {
      return replyTemp(message, C.fail("I need **Embed Links** permission in this channel."), client, ERROR_DELETE_MS);
    }

    if (command.botPerms && !me.permissions.has(PermissionsBitField.resolve(command.botPerms))) {
      return replyTemp(message, C.fail(`I need **${command.botPerms}** permission to run \`${command.name}\`.`), client, ERROR_DELETE_MS);
    }
    if (command.userPerms && !message.member.permissions.has(PermissionsBitField.resolve(command.userPerms))) {
      return replyTemp(message, C.fail(`You need **${command.userPerms}** permission to run \`${command.name}\`.`), client, ERROR_DELETE_MS);
    }

    /* ── Owner-only ──────────────────────────────── */
    if (command.owner && !OWNER_IDS.includes(message.author.id)) {
      return replyTemp(message, C.fail("This command is restricted to the **bot owner**."), client, ERROR_DELETE_MS);
    }

    /* ── Args check ──────────────────────────────── */
    if (command.args && !args.length) {
      const usage = command.usage ? `\nUsage: \`${prefix}${command.name} ${command.usage}\`` : "";
      return replyTemp(message, C.fail(`Missing arguments.${usage}`), client, ERROR_DELETE_MS);
    }

    /* ── Player checks ───────────────────────────── */
    if (command.player && !client.manager.players.get(message.guild.id)) {
      return replyTemp(message, C.fail(`No active player. Use \`${prefix}play\` to start one.`), client, ERROR_DELETE_MS);
    }
    if (command.inVoiceChannel && !message.member.voice.channelId) {
      return replyTemp(message, C.fail("You must be in a **voice channel**."), client, ERROR_DELETE_MS);
    }
    if (command.sameVoiceChannel && me.voice.channel && me.voice.channelId !== message.member.voice.channelId) {
      return replyTemp(message, C.fail(`You must be in <#${me.voice.channelId}>.`), client, ERROR_DELETE_MS);
    }

    /* ── Execute ─────────────────────────────────── */
    try {
      await command.execute(message, args, client, prefix);
    } catch (err) {
      client.logger.log(`[CMD] Error in ${command.name}: ${err.message}`, "error");
      replyTemp(message, C.fail("An unexpected error occurred."), client, ERROR_DELETE_MS);
    }

    /* ── Command logging ─────────────────────────── */
    try {
      new WebhookClient({ url: client.config.Webhooks.cmdrun }).send({
        embeds: [
          new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setColor(client.color).setTimestamp()
            .setDescription(
              `**Server:** \`${message.guild.name}\` (\`${message.guild.id}\`)\n` +
              `**Command:** \`${command.name}\`\n` +
              `**User:** \`${message.author.tag}\` (\`${message.author.id}\`)`
            ),
        ],
      }).catch(() => null);
    } catch {}
  },
};