/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — MusicClient
 *
 *  Extended Discord.js Client with music, database, voting, dashboard.
 * ══════════════════════════════════════════════════════════════════ */

const { Client, Collection } = require("discord.js");
const mongoose = require("mongoose");
const http = require("http");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const { AutoPoster } = require("topgg-autoposter");
const loadPlayerManager = require("../loaders/loadPlayerManager");
const permissionHandler = require("../events/Client/PremiumChecks");
const VoiceHealthMonitor = require("../utils/voiceHealthMonitor");
const { numb } = require("../utils/convert");

class MusicBot extends Client {
  constructor() {
    super({
      intents: 33779,
      properties: { browser: "Discord Android" },
      allowedMentions: { parse: ["roles", "users", "everyone"], repliedUser: false },
      shards: getInfo().SHARD_LIST,
      shardCount: getInfo().TOTAL_SHARDS,
    });

    /* ── Config & Constants ──────────────────────── */
    this.config = require("../config.js");
    this.owner = this.config.ownerID;
    this.ownerIds = this.config.ownerIds;
    this.prefix = this.config.prefix;
    this.embedColor = this.config.embedColor;

    /* ── Collections ─────────────────────────────── */
    this.commands = new Collection();
    this.slashCommands = new Collection();
    this.slashCommandData = [];
    this.aliases = new Collection();
    this.cooldowns = new Collection();
    this.spamMap = new Map();
    this.snipes = new Map();

    /* ── Custom Builders ─────────────────────────── */
    /* DEPRECATED: client.button — will be removed after command refactor.
     * Use client.components.btn.primary/secondary/danger/success/link instead.
     * Kept temporarily for backward compatibility with prefix commands. */
    this.button = require("../custom/button.js");
    this.embed = require("../custom/embed.js")(this.embedColor);
    this.components = require("../custom/components.js");
    this.numb = numb;

    /* ── Utilities ───────────────────────────────── */
    this.logger = require("../utils/logger.js");
    this.emoji = require("../utils/emojis.js");
    this.cluster = new ClusterClient(this);

    /* ── Token Fallback ──────────────────────────── */
    if (!this.token) this.token = this.config.token;

    /* ── State ───────────────────────────────────── */
    this.manager = null;
    this.dashboard = null;
    this.maintenance = false;
    this.maintenanceReason = null;

    /* ── Voice Health Monitor ────────────────────── */
    this.voiceHealthMonitor = new VoiceHealthMonitor(this);

    /* ── Initialize Systems ──────────────────────── */
    this._connectMongodb();
    this._initAutoPoster();
    permissionHandler(this);
    loadPlayerManager(this);
    this._loadModules();

    this.once("ready", () => {
      this._initTopggWebhook();
      this._initDashboard();
    });
  }

  /* ── Module Loader ─────────────────────────────── */

  _loadModules() {
    const modules = [
      "loadAntinukes", "loadAutoMods", "loadClients",
      "loadCommands", "loadNodes", "loadSlashCommands", "loadPlayers",
    ];
    for (const mod of modules) {
      try { require(`../loaders/${mod}`)(this); }
      catch (err) { this.logger.log(`[LOADER] Failed to load ${mod}: ${err.message}`, "error"); }
    }
  }

  /* ── MongoDB ───────────────────────────────────── */

  async _connectMongodb() {
    mongoose.set("strictQuery", false);
    try { await mongoose.connect(this.config.mongourl, { autoIndex: false, connectTimeoutMS: 10_000, family: 4 }); }
    catch (err) { this.logger.log(`[DB] Initial connection failed: ${err.message}`, "error"); }

    mongoose.Promise = global.Promise;
    mongoose.connection.on("connected", () => this.logger.log("[DB] MongoDB connected", "ready"));
    mongoose.connection.on("error", (e) => this.logger.log(`[DB] Error: ${e.message}`, "error"));
    mongoose.connection.on("disconnected", () => this.logger.log("[DB] Disconnected", "warn"));
  }

  /* ── Top.gg AutoPoster ─────────────────────────── */

  _initAutoPoster() {
    const t = this.config.topgg;
    if (!t || t === "here") return;
    try {
      const ap = AutoPoster(t, this);
      ap.on("posted", (s) => this.logger.log(`[Top.gg] Posted: ${s.serverCount ?? this.guilds.cache.size} servers`, "ready"));
      ap.on("error", (e) => this.logger.log(`[Top.gg] AutoPoster error: ${e.message || e}`, "error"));
    } catch (e) { this.logger.log(`[Top.gg] Init failed: ${e.message}`, "error"); }
  }

  /* ── Top.gg Vote Webhook ───────────────────────── */

  _initTopggWebhook() {
    const cfg = this.config.topggWebhook;
    if (!cfg?.enabled) return;
    const { port, auth } = cfg;
    const client = this;
    const { recordVote, sendVoteThankYouDM } = require("../utils/topgg");

    const server = http.createServer((req, res) => {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
      }
      if (req.method !== "POST" || req.url !== "/topgg/vote") {
        res.writeHead(404); return res.end();
      }
      if (auth && req.headers.authorization !== auth) {
        res.writeHead(401); return res.end();
      }
      let body = "";
      req.on("data", (c) => { body += c; if (body.length > 10_240) { res.writeHead(413); res.end(); req.destroy(); } });
      req.on("end", async () => {
        try {
          const { user: userId } = JSON.parse(body);
          if (!userId) { res.writeHead(400); return res.end(); }
          await recordVote(userId);
          await sendVoteThankYouDM(client, userId);
          res.writeHead(200); res.end(JSON.stringify({ status: "ok" }));
        } catch { res.writeHead(400); res.end(); }
      });
      req.on("error", () => { res.writeHead(500); res.end(); });
    });

    server.listen(port, () => client.logger.log(`[Top.gg] Webhook on port ${port}`, "ready"));
    server.on("error", (e) => client.logger.log(`[Top.gg] ${e.code === "EADDRINUSE" ? `Port ${port} in use` : e.message}`, "error"));
  }

  /* ── Dashboard ─────────────────────────────────── */

  _initDashboard() {
    if (!this.config.dashboard?.enabled) return;
    try { require("../dashboard/server").init(this); }
    catch (e) { this.logger.log(`[Dashboard] Failed: ${e.message}`, "error"); }
  }

  /* ── Login ─────────────────────────────────────── */

  connect() { return super.login(this.token); }
}

module.exports = MusicBot;