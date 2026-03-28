/** @format */

const { Router } = require("express");
const { requireAuth, requireGuildAdmin } = require("../../middleware/auth");
const Prefix = require("../../../schema/prefix");
const AntiNuke = require("../../../schema/antinuke");
const AntiLink = require("../../../schema/antilink");
const AntiSpam = require("../../../schema/antispam");
const AutoRole = require("../../../schema/autorole");
const AutoResp = require("../../../schema/ar");
const AutoReact = require("../../../schema/autoreact");
const { getSettings } = require("../../../schema/welcomesystem");

const router = Router();

async function getGuildMeta(client, guildId) {
  const evalFn = (c, ctx) => {
    const g = c.guilds.cache.get(ctx.guildId);
    if (!g) return null;
    return {
      id: g.id, name: g.name,
      textChannels: g.channels.cache.filter((ch) => ch.type === 0 || ch.type === 5).map((ch) => ({ id: ch.id, name: ch.name })).sort((a, b) => a.name.localeCompare(b.name)),
      roles: g.roles.cache.filter((r) => r.id !== g.id && !r.managed).map((r) => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position })).sort((a, b) => b.position - a.position),
    };
  };
  try {
    if (client.cluster) {
      const results = await client.cluster.broadcastEval(evalFn, { context: { guildId } });
      return results.find((r) => r != null) || null;
    }
    return evalFn(client, { guildId });
  } catch { return null; }
}

/* GET full config */
router.get("/:guildId", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    const guildMeta = await getGuildMeta(req.client, guildId);
    if (!guildMeta) return res.status(404).json({ error: "Guild not found" });

    const [prefix, antinuke, antilink, antispam, autorole, autoResp, autoReact] = await Promise.all([
      Prefix.findOne({ Guild: guildId }),
      AntiNuke.findOne({ guildId }),
      AntiLink.findOne({ guildId }),
      AntiSpam.findOne({ guildId }),
      AutoRole.findOne({ guildId }),
      AutoResp.findOne({ guildId }),
      AutoReact.find({ guildId }),
    ]);

    let welcomeData = null;
    try { welcomeData = await getSettings({ id: guildId, name: guildMeta.name, preferredLocale: "en", ownerId: "0", joinedAt: new Date(), members: { cache: new Map() } }); } catch {}

    res.json({
      prefix: prefix?.Prefix || req.client.prefix,
      welcome: {
        enabled: welcomeData?.welcome?.enabled || false,
        channel: welcomeData?.welcome?.channel || "",
        content: welcomeData?.welcome?.content || "",
        autodel: welcomeData?.welcome?.autodel || 0,
        embed: {
          title: welcomeData?.welcome?.embed?.title || "",
          description: welcomeData?.welcome?.embed?.description || "",
          footer: welcomeData?.welcome?.embed?.footer || "",
          image: welcomeData?.welcome?.embed?.image || "",
          thumbnail: welcomeData?.welcome?.embed?.thumbnail || "",
          color: welcomeData?.welcome?.embed?.color || "",
        },
      },
      antinuke: {
        isEnabled: antinuke?.isEnabled || false,
        punishment: antinuke?.punishment || "ban",
        logChannelId: antinuke?.logChannelId || "",
        modules: antinuke?.modules?.toObject?.() || antinuke?.modules || {},
      },
      automod: {
        antilink: { isEnabled: antilink?.isEnabled || false },
        antispam: { isEnabled: antispam?.isEnabled || false, messageThreshold: antispam?.messageThreshold || 5, timeframe: antispam?.timeframe || 10 },
      },
      autorole: { humanRoles: autorole?.humanRoles || [], botRoles: autorole?.botRoles || [] },
      autoresponder: (autoResp?.autoresponses || []).map((a) => ({ trigger: a.trigger, response: a.response })),
      autoreact: (autoReact || []).map((a) => ({ keyword: a.keyword, emoji: a.emoji })),
      meta: { textChannels: guildMeta.textChannels, roles: guildMeta.roles },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* PUT prefix */
router.put("/:guildId/prefix", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const prefix = String(req.body.prefix || "").trim();
    if (!prefix || prefix.length > 5) return res.status(400).json({ error: "Prefix must be 1-5 characters" });
    const old = await Prefix.findOne({ Guild: req.params.guildId });
    await Prefix.findOneAndUpdate({ Guild: req.params.guildId }, { Guild: req.params.guildId, Prefix: prefix, oldPrefix: old?.Prefix || req.client.prefix }, { upsert: true, new: true });
    res.json({ success: true, prefix });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* PUT antinuke */
router.put("/:guildId/antinuke", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { isEnabled, punishment, logChannelId, modules } = req.body;
    const update = {};
    if (typeof isEnabled === "boolean") update.isEnabled = isEnabled;
    if (["ban", "kick", "stripRoles"].includes(punishment)) update.punishment = punishment;
    if (logChannelId !== undefined) update.logChannelId = logChannelId || null;

    if (modules && typeof modules === "object") {
      const valid = ["antiBan","antiKick","antiUnban","antiRole","antiChannel","antiWebhook","antiEmoji","antiSticker","antiEveryone","antiGuildUpdate","antiBotAdd","antiMemberUpdate","antiAutomodRule"];
      update.modules = {};
      for (const key of valid) {
        if (!modules[key]) continue;
        update.modules[key] = {
          enabled: !!modules[key].enabled,
          threshold: Math.min(Math.max(Number(modules[key].threshold) || 3, 1), 20),
          timeframe: Math.min(Math.max(Number(modules[key].timeframe) || 60, 5), 300),
        };
      }
    }

    await AntiNuke.findOneAndUpdate({ guildId }, { guildId, ...update }, { upsert: true, new: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* PUT automod */
router.put("/:guildId/automod", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { antilink, antispam } = req.body;
    if (antilink && typeof antilink.isEnabled === "boolean") {
      await AntiLink.findOneAndUpdate({ guildId }, { guildId, isEnabled: antilink.isEnabled }, { upsert: true, new: true });
    }
    if (antispam && typeof antispam === "object") {
      const u = { guildId };
      if (typeof antispam.isEnabled === "boolean") u.isEnabled = antispam.isEnabled;
      if (antispam.messageThreshold !== undefined) u.messageThreshold = Math.min(Math.max(Number(antispam.messageThreshold) || 5, 2), 30);
      if (antispam.timeframe !== undefined) u.timeframe = Math.min(Math.max(Number(antispam.timeframe) || 10, 3), 60);
      await AntiSpam.findOneAndUpdate({ guildId }, u, { upsert: true, new: true });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* PUT welcome */
router.put("/:guildId/welcome", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const settings = await getSettings({ id: req.params.guildId, name: "g", preferredLocale: "en", ownerId: "0", joinedAt: new Date(), members: { cache: new Map() } });
    const { enabled, channel, content, autodel, embed } = req.body;
    if (!settings.welcome) settings.welcome = {};
    if (typeof enabled === "boolean") settings.welcome.enabled = enabled;
    if (channel !== undefined) settings.welcome.channel = channel;
    if (content !== undefined) settings.welcome.content = String(content).substring(0, 2000);
    if (autodel !== undefined) settings.welcome.autodel = Number(autodel) || 0;
    if (embed && typeof embed === "object") {
      if (!settings.welcome.embed) settings.welcome.embed = {};
      for (const key of ["title","description","footer","image","thumbnail","color"]) {
        if (embed[key] !== undefined) settings.welcome.embed[key] = String(embed[key]).substring(0, 2000);
      }
    }
    settings.markModified("welcome");
    await settings.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* PUT autorole */
router.put("/:guildId/autorole", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { humanRoles, botRoles } = req.body;
    const meta = await getGuildMeta(req.client, guildId);
    if (!meta) return res.status(404).json({ error: "Guild not found" });
    const validIds = new Set(meta.roles.map((r) => r.id));
    const sanitize = (arr) => (Array.isArray(arr) ? arr.filter((id) => validIds.has(id)).slice(0, 5) : []);
    await AutoRole.findOneAndUpdate({ guildId }, { guildId, humanRoles: sanitize(humanRoles), botRoles: sanitize(botRoles) }, { upsert: true, new: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* POST autoresponder add */
router.post("/:guildId/autoresponder", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const { trigger, response } = req.body;
    if (!trigger || !response) return res.status(400).json({ error: "Trigger and response required" });
    const doc = await AutoResp.findOneAndUpdate(
      { guildId: req.params.guildId },
      { guildId: req.params.guildId, $push: { autoresponses: { trigger: String(trigger).substring(0, 200), response: String(response).substring(0, 2000) } } },
      { upsert: true, new: true }
    );
    if ((doc.autoresponses || []).length > 25) return res.status(400).json({ error: "Max 25 autoresponses" });
    res.json({ success: true, autoresponder: doc.autoresponses });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* DELETE autoresponder remove */
router.delete("/:guildId/autoresponder", requireAuth, requireGuildAdmin, async (req, res) => {
  try {
    const { trigger } = req.body;
    if (!trigger) return res.status(400).json({ error: "Trigger required" });
    await AutoResp.findOneAndUpdate({ guildId: req.params.guildId }, { $pull: { autoresponses: { trigger } } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;