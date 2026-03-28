/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Antinuke Engine
 *
 *  Centralized antinuke utility with in-memory rate limiting,
 *  audit log resolution, punishment execution, and logging.
 * ══════════════════════════════════════════════════════════════════════ */

const AntiNuke = require("../schema/antinuke");
const { MARK, COLORS: BRAND_COLORS } = require("../custom/components");

/* ── Module Defaults ─────────────────────────────── */

const MODULE_DEFAULTS = {
  antiBan:          { enabled: true, threshold: 3, timeframe: 60 },
  antiKick:         { enabled: true, threshold: 3, timeframe: 60 },
  antiUnban:        { enabled: true, threshold: 3, timeframe: 60 },
  antiRole:         { enabled: true, threshold: 3, timeframe: 60 },
  antiChannel:      { enabled: true, threshold: 2, timeframe: 60 },
  antiWebhook:      { enabled: true, threshold: 3, timeframe: 60 },
  antiEmoji:        { enabled: true, threshold: 5, timeframe: 60 },
  antiSticker:      { enabled: true, threshold: 3, timeframe: 60 },
  antiEveryone:     { enabled: true, threshold: 1, timeframe: 60 },
  antiGuildUpdate:  { enabled: true, threshold: 1, timeframe: 60 },
  antiBotAdd:       { enabled: true, threshold: 1, timeframe: 60 },
  antiMemberUpdate: { enabled: true, threshold: 3, timeframe: 60 },
  antiAutomodRule:  { enabled: true, threshold: 2, timeframe: 60 },
};

const MODULE_LABELS = {
  antiBan:          "Anti Ban",
  antiKick:         "Anti Kick",
  antiUnban:        "Anti Unban",
  antiRole:         "Anti Role",
  antiChannel:      "Anti Channel",
  antiWebhook:      "Anti Webhook",
  antiEmoji:        "Anti Emoji",
  antiSticker:      "Anti Sticker",
  antiEveryone:     "Anti Everyone",
  antiGuildUpdate:  "Anti Guild Update",
  antiBotAdd:       "Anti Bot Add",
  antiMemberUpdate: "Anti Member Update",
  antiAutomodRule:  "Anti Automod Rule",
};

/* ── In-Memory Rate Limiter ──────────────────────── */

const actionTracker = new Map();

/**
 * Periodic cleanup — prevents memory leaks from stale entries.
 * Runs every 5 minutes, removes entries older than 5 minutes.
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_ENTRY_AGE_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entries] of actionTracker) {
    const fresh = entries.filter((t) => now - t <= MAX_ENTRY_AGE_MS);
    if (fresh.length === 0) {
      actionTracker.delete(key);
    } else {
      actionTracker.set(key, fresh);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Records an action timestamp for rate limiting
 * @param {string} guildId
 * @param {string} executorId
 * @param {string} action - Module name (e.g., "antiBan")
 */
function trackAction(guildId, executorId, action) {
  const key = `${guildId}:${executorId}:${action}`;
  const entries = actionTracker.get(key) || [];
  entries.push(Date.now());
  actionTracker.set(key, entries);
}

/**
 * Returns the count of actions within a timeframe
 * @param {string} guildId
 * @param {string} executorId
 * @param {string} action
 * @param {number} timeframeMs
 * @returns {number}
 */
function getActionCount(guildId, executorId, action, timeframeMs) {
  const key = `${guildId}:${executorId}:${action}`;
  const now = Date.now();
  let entries = actionTracker.get(key) || [];
  entries = entries.filter((t) => now - t <= timeframeMs);
  actionTracker.set(key, entries);
  return entries.length;
}

/**
 * Clears all tracked actions for a specific key
 * @param {string} guildId
 * @param {string} executorId
 * @param {string} action
 */
function clearAction(guildId, executorId, action) {
  actionTracker.delete(`${guildId}:${executorId}:${action}`);
}

/* ── Helpers ─────────────────────────────────────── */

/**
 * Retrieves module settings with defaults
 * @param {Object} data - Antinuke document from MongoDB
 * @param {string} name - Module name
 * @returns {{ enabled: boolean, threshold: number, timeframe: number }}
 */
function getModule(data, name) {
  const defaults = MODULE_DEFAULTS[name] || { enabled: true, threshold: 3, timeframe: 60 };
  const mod = data.modules?.[name] || {};
  return {
    enabled: mod.enabled ?? defaults.enabled,
    threshold: mod.threshold ?? defaults.threshold,
    timeframe: mod.timeframe ?? defaults.timeframe,
  };
}

/**
 * Fetches antinuke settings from the database
 * @param {string} guildId
 * @returns {Promise<Object|null>}
 */
async function fetchSettings(guildId) {
  return AntiNuke.findOne({ guildId }).catch(() => null);
}

/**
 * Resolves the executor of an auditable action
 * @param {import("discord.js").Guild} guild
 * @param {import("discord.js").Client} client
 * @param {Object} data - Antinuke settings document
 * @param {number} auditType - AuditLogEvent type
 * @param {Object} [opts]
 * @param {number} [opts.maxAge=5000] - Max audit entry age in ms
 * @returns {Promise<Object|null>}
 */
async function resolveExecutor(guild, client, data, auditType, opts = {}) {
  const audit = await guild
    .fetchAuditLogs({ type: auditType, limit: 1 })
    .catch(() => null);

  const entry = audit?.entries?.first();
  if (!entry) return null;

  const maxAge = opts.maxAge ?? 5000;
  if (maxAge && Date.now() - entry.createdTimestamp > maxAge) return null;

  const executor = entry.executor;
  if (!executor) return null;

  /* Skip authorized users: server owner, bot itself, extra owners */
  const authorized = new Set([
    guild.ownerId,
    client.user.id,
    ...(data.extraOwners || []),
  ]);
  if (authorized.has(executor.id)) return null;

  const member = await guild.members.fetch(executor.id).catch(() => null);
  if (!member) return null;

  const isWhitelisted =
    (data.whitelistUsers || []).includes(executor.id) ||
    member.roles.cache.some((r) => (data.whitelistRoles || []).includes(r.id));

  return { executor, member, entry, isWhitelisted, target: entry.target };
}

/**
 * Executes punishment on a member
 * @param {import("discord.js").Guild} guild
 * @param {import("discord.js").GuildMember} member
 * @param {"ban"|"kick"|"stripRoles"} type
 * @param {string} reason
 */
async function punish(guild, member, type, reason) {
  const memberId = member.id || member;
  const prefix = "Aevix Antinuke";

  try {
    switch (type) {
      case "kick":
        if (member.kickable) {
          await member.kick(`${prefix}: ${reason}`);
        } else {
          await guild.members.ban(memberId, { reason: `${prefix}: ${reason} (kick failed, escalated)` });
        }
        break;

      case "stripRoles":
        if (member.manageable) {
          await member.roles.set([], `${prefix}: ${reason}`);
        } else {
          await guild.members.ban(memberId, { reason: `${prefix}: ${reason} (strip failed, escalated)` });
        }
        break;

      case "ban":
      default:
        await guild.members.ban(memberId, { reason: `${prefix}: ${reason}` });
        break;
    }
  } catch {
    /* Fallback: always try ban as last resort */
    try {
      await guild.members.ban(memberId, { reason: `${prefix}: ${reason} (fallback)` });
    } catch {
      /* Exhausted all options — bot lacks permission */
    }
  }
}

/**
 * Sends a branded log message to the antinuke log channel
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Guild} guild
 * @param {Object} data - Antinuke settings
 * @param {Object} opts - Log options
 * @param {string} [opts.title] - Log title
 * @param {string} [opts.description] - Log body
 * @param {number} [opts.color] - Accent color override
 * @param {boolean} [opts.isWhitelisted] - Whether executor was whitelisted
 * @param {Array<{name:string, value:string}>} [opts.fields] - Additional fields
 */
async function sendLog(client, guild, data, opts = {}) {
  const logChannel = data.logChannelId && guild.channels.cache.get(data.logChannelId);
  if (!logChannel) return;

  const C = client.components;
  const color = opts.color || (opts.isWhitelisted ? BRAND_COLORS.brand : BRAND_COLORS.error);

  const container = C.container(color)
    .addTextDisplayComponents(C.text(`### ${opts.title || "Antinuke Alert"}`))
    .addSeparatorComponents(C.separator());

  if (opts.description) {
    container.addTextDisplayComponents(C.text(opts.description));
  }

  if (opts.fields?.length) {
    const fieldText = opts.fields.map((f) => `**${f.name}:** ${f.value}`).join("\n");
    container.addSeparatorComponents(C.separator()).addTextDisplayComponents(C.text(fieldText));
  }

  container
    .addSeparatorComponents(C.separator())
    .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Antinuke`));

  await logChannel.send(C.v2(container)).catch(() => null);
}

/* ── Main Handler ────────────────────────────────── */

/**
 * Unified antinuke handler — checks settings, resolves executor,
 * tracks rate limits, reverts/punishes, and logs.
 *
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Guild} guild
 * @param {string} moduleName - Key from MODULE_DEFAULTS
 * @param {number} auditType - AuditLogEvent type
 * @param {Object} [opts]
 * @param {number} [opts.maxAge] - Max audit entry age
 * @param {string} [opts.label] - Human-readable module name for logs
 * @param {Function} [opts.targetCheck] - Additional validation on audit entry
 * @param {Function} [opts.recover] - Async function to revert the action
 * @param {Array} [opts.fields] - Extra fields for log messages
 * @returns {Promise<Object|null>}
 */
async function handleAntiNuke(client, guild, moduleName, auditType, opts = {}) {
  try {
    const data = await fetchSettings(guild.id);
    if (!data?.isEnabled) return null;

    const mod = getModule(data, moduleName);
    if (!mod.enabled) return null;

    const label = opts.label || MODULE_LABELS[moduleName] || moduleName;

    const result = await resolveExecutor(guild, client, data, auditType, {
      maxAge: opts.maxAge || 5000,
    });
    if (!result) return null;

    if (opts.targetCheck && !opts.targetCheck(result.entry)) return null;

    const { executor, member, isWhitelisted } = result;

    /* Whitelisted — log only, no action */
    if (isWhitelisted) {
      await sendLog(client, guild, data, {
        title: `${client.emoji.tick} Whitelisted: ${label}`,
        description:
          `**${executor.tag}** (\`${executor.id}\`) triggered **${label}** but is whitelisted.\n` +
          `No action was taken.`,
        isWhitelisted: true,
        fields: opts.fields,
      });
      return null;
    }

    /* Always revert unauthorized actions immediately */
    if (opts.recover) {
      try {
        await opts.recover();
      } catch {
        /* Recovery failed — still punish the executor */
      }
    }

    /* Track and check threshold */
    trackAction(guild.id, executor.id, moduleName);
    const count = getActionCount(guild.id, executor.id, moduleName, mod.timeframe * 1000);
    const exceeded = count >= mod.threshold;

    if (exceeded) {
      /* Threshold exceeded — punish */
      await punish(guild, member, data.punishment || "ban", label);
      clearAction(guild.id, executor.id, moduleName);

      await sendLog(client, guild, data, {
        title: `${client.emoji.cross} ${label} — Punished`,
        description:
          `**${executor.tag}** (\`${executor.id}\`) exceeded the threshold.\n\n` +
          `${client.emoji.dot} **Actions:** \`${count}/${mod.threshold}\` in \`${mod.timeframe}s\`\n` +
          `${client.emoji.dot} **Punishment:** \`${(data.punishment || "ban").toUpperCase()}\``,
        fields: opts.fields,
      });
    } else {
      /* Below threshold — revert only, warn in logs */
      await sendLog(client, guild, data, {
        title: `${client.emoji.warn} ${label} — Reverted`,
        description:
          `**${executor.tag}** (\`${executor.id}\`) — unauthorized action reverted.\n\n` +
          `${client.emoji.dot} **Actions:** \`${count}/${mod.threshold}\` in \`${mod.timeframe}s\`\n` +
          `-# Next offense may result in punishment.`,
        color: BRAND_COLORS.warn,
        fields: opts.fields,
      });
    }

    return { executor, member, exceeded, count };
  } catch (e) {
    console.error(`[ANTINUKE] ${moduleName} error:`, e);
    return null;
  }
}

/* ── Exports ─────────────────────────────────────── */

module.exports = {
  fetchSettings,
  resolveExecutor,
  sendLog,
  handleAntiNuke,
  punish,
  getModule,
  trackAction,
  getActionCount,
  clearAction,
  MODULE_DEFAULTS,
  MODULE_LABELS,
};