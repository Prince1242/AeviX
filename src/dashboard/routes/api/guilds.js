/** @format */

const { Router } = require("express");
const { requireAuth, requireGuildAdmin } = require("../../middleware/auth");
const { fetchUserGuilds, guildIconUrl } = require("../../lib/discord-oauth");
const Prefix = require("../../../schema/prefix");

const router = Router();

async function getBotGuildIds(client) {
  try {
    if (client.cluster) {
      const results = await client.cluster.broadcastEval((c) => [...c.guilds.cache.keys()]);
      return [...new Set(results.flat().filter(Boolean))];
    }
    return [...client.guilds.cache.keys()];
  } catch {
    return [...client.guilds.cache.keys()];
  }
}

async function getGuildSnapshot(client, guildId) {
  try {
    const evalFn = (c, ctx) => {
      const g = c.guilds.cache.get(ctx.guildId);
      if (!g) return null;
      return {
        id: g.id, name: g.name, memberCount: g.memberCount,
        icon: g.iconURL({ size: 512 }), banner: g.bannerURL({ size: 1024 }),
        channelCount: g.channels.cache.size, roleCount: g.roles.cache.size,
        boostCount: g.premiumSubscriptionCount || 0,
      };
    };
    if (client.cluster) {
      const results = await client.cluster.broadcastEval(evalFn, { context: { guildId } });
      return results.find((r) => r != null) || null;
    }
    return evalFn(client, { guildId });
  } catch { return null; }
}

/* GET /api/guilds */
router.get("/", requireAuth, async (req, res) => {
  try {
    const userGuilds = await fetchUserGuilds(req);
    const botGuildIds = new Set(await getBotGuildIds(req.client));

    const mutual = [], invitable = [];

    for (const g of userGuilds) {
      const perms = BigInt(g.permissions ?? "0");
      const canManage = g.owner === true || (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
      if (!canManage) continue;

      /* Handle both Discord API format and bot-cache fallback format */
      const iconUrl = g.icon
        ? (g.icon.startsWith("http")
          ? g.icon
          : `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.webp?size=256`)
        : null;

      const payload = {
        id: g.id,
        name: g.name,
        icon: iconUrl || guildIconUrl(g),
        owner: g.owner || false,
      };

      if (botGuildIds.has(g.id)) {
        mutual.push(payload);
      } else {
        invitable.push({ ...payload, invitable: true });
      }
    }

    mutual.sort((a, b) => a.name.localeCompare(b.name));
    invitable.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ mutual, invitable });
  } catch (err) {
    req.client.logger.log(`[Dashboard] Guilds: ${err.message}`, "error");

    if (err.message.includes("expired") || err.message.includes("NO_TOKEN") || err.message.includes("REFRESH_FAILED")) {
      return res.status(401).json({ error: "Session expired. Please login again.", code: "REAUTH" });
    }

    /* Instead of blocking, return empty lists with a warning */
    res.json({
      mutual: [],
      invitable: [],
      warning: "Could not fetch all guilds. Only mutual servers (where Aevix is present) may be shown.",
    });
  }
});

/* GET /api/guilds/:guildId */
router.get("/:guildId", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const guild = await getGuildSnapshot(req.client, req.params.guildId);
    if (!guild) return res.status(404).json({ error: "Guild not found in bot cache" });
    const prefixDoc = await Prefix.findOne({ Guild: guild.id });
    guild.prefix = prefixDoc?.Prefix || req.client.prefix;
    guild.hasPlayer = !!req.client.manager?.players?.get(guild.id);
    res.json(guild);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;