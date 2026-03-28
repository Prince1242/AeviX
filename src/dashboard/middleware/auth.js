/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Dashboard Auth Middleware
 * ══════════════════════════════════════════════════════════════════ */

const { fetchUserGuilds } = require("../lib/discord-oauth");

/**
 * Requires an authenticated session.
 * API routes get 401 JSON. Page routes get redirected to login.
 */
function requireAuth(req, res, next) {
  if (req.session?.user?.id) return next();

  if (req.originalUrl.startsWith("/api/")) {
    return res.status(401).json({ error: "Unauthorized", code: "REAUTH" });
  }
  return res.redirect("/auth/login");
}

/**
 * Requires bot owner.
 */
function requireOwner(req, res, next) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized", code: "REAUTH" });
  }
  if (!req.client.config.ownerIds.includes(req.session.user.id)) {
    return res.status(403).json({ error: "Forbidden — owner only" });
  }
  next();
}

/**
 * Requires the user to have Administrator or Manage Server
 * permission in the guild specified by :guildId.
 */
async function requireGuildAdmin(req, res, next) {
  try {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: "Unauthorized", code: "REAUTH" });
    }

    const guildId = req.params.guildId;
    if (!guildId || !/^\d{17,20}$/.test(guildId)) {
      return res.status(400).json({ error: "Invalid guild ID format" });
    }

    let userGuilds;
    try {
      userGuilds = await fetchUserGuilds(req);
    } catch (err) {
      /* Categorize OAuth errors */
      if (
        err.message.includes("expired") ||
        err.message.includes("NO_TOKEN") ||
        err.message.includes("REFRESH_FAILED")
      ) {
        return res.status(401).json({
          error: "Session expired. Please login again.",
          code: "REAUTH",
        });
      }
      if (err.message.includes("guilds scope") || err.message.includes("guild access")) {
        return res.status(403).json({
          error: "Discord denied guild access. Please re-login to grant permissions.",
          code: "REAUTHORIZE_REQUIRED",
        });
      }
      throw err;
    }

    const guild = userGuilds.find((g) => g.id === guildId);
    if (!guild) {
      return res.status(403).json({ error: "You are not in this server" });
    }

    const perms = BigInt(guild.permissions ?? "0");
    const ADMINISTRATOR = 0x8n;
    const MANAGE_GUILD = 0x20n;
    const canManage = guild.owner === true || (perms & ADMINISTRATOR) === ADMINISTRATOR || (perms & MANAGE_GUILD) === MANAGE_GUILD;

    if (!canManage) {
      return res.status(403).json({
        error: "You need Administrator or Manage Server permission in this server",
      });
    }

    req.userGuildAccess = {
      id: guild.id,
      name: guild.name,
      owner: guild.owner,
      permissions: guild.permissions,
    };
    next();
  } catch (err) {
    req.client?.logger?.log(`[Auth] requireGuildAdmin error: ${err.message}`, "error");
    return res.status(500).json({ error: "Permission check failed" });
  }
}

module.exports = { requireAuth, requireOwner, requireGuildAdmin };