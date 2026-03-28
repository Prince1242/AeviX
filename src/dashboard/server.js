/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Dashboard Server
 *
 *  Express + Socket.IO dashboard with OAuth2, config CRUD,
 *  real-time music controls, and vote webhook.
 * ══════════════════════════════════════════════════════════════════ */

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const { createServer } = require("http");
const { Server: SocketIO } = require("socket.io");
const path = require("path");

let io = null;

/* ── Config Validation ───────────────────────────── */

function validateConfig(client) {
  const cfg = client.config.dashboard;
  const errors = [];

  if (!cfg) errors.push("dashboard config block is missing");
  if (!cfg?.clientSecret || cfg.clientSecret.includes("Paste") || cfg.clientSecret.length < 10) {
    errors.push("clientSecret is missing or placeholder — get it from Discord Developer Portal > OAuth2 > General > Client Secret");
  }
  if (!cfg?.callbackUrl) errors.push("callbackUrl is missing");
  if (!cfg?.sessionSecret) errors.push("sessionSecret is missing");
  if (!cfg?.port) errors.push("port is missing");
  if (!client.config.clientId) errors.push("clientId is missing from main config");
  if (!client.config.mongourl) errors.push("mongourl is missing from main config");

  /* Validate callback URL format */
  if (cfg?.callbackUrl) {
    try {
      const url = new URL(cfg.callbackUrl);
      if (!url.pathname.endsWith("/auth/callback")) {
        errors.push(`callbackUrl path should end with /auth/callback (got: ${url.pathname})`);
      }
    } catch {
      errors.push(`callbackUrl is not a valid URL: ${cfg.callbackUrl}`);
    }
  }

  return errors;
}

/* ── Main Init ───────────────────────────────────── */

function init(client) {
  const config = client.config.dashboard;
  if (!config?.enabled) return;

  if (client.cluster && client.cluster.id !== 0) {
    client.logger.log(`[Dashboard] Skipping on cluster ${client.cluster.id}`, "log");
    return;
  }

  /* ── Validate Config ───────────────────────────── */
  const configErrors = validateConfig(client);
  if (configErrors.length > 0) {
    client.logger.log(`[Dashboard] Configuration errors:`, "error");
    for (const err of configErrors) {
      client.logger.log(`  → ${err}`, "error");
    }
    client.logger.log(`[Dashboard] Fix the above errors in src/config.js and restart`, "error");
    return;
  }

  const app = express();
  const httpServer = createServer(app);

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  /* ── Security Headers ──────────────────────────── */
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  /* ── Socket.IO ─────────────────────────────────── */
  io = new SocketIO(httpServer, {
    cors: { origin: config.baseUrl, credentials: true },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  /* ── Body Parsing ──────────────────────────────── */
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  /* ── Session Store ─────────────────────────────── */
  const secureCookie = String(config.baseUrl || "").startsWith("https://");

  let sessionStore;
  try {
    sessionStore = MongoStore.create({
      mongoUrl: client.config.mongourl,
      collectionName: "dashboard_sessions",
      ttl: 7 * 24 * 60 * 60,
      autoRemove: "native",
      touchAfter: 3600,
    });

    sessionStore.on("error", (err) => {
      client.logger.log(`[Dashboard] Session store error: ${err.message}`, "error");
    });
  } catch (err) {
    client.logger.log(`[Dashboard] Failed to create session store: ${err.message}`, "error");
    return;
  }

  const sessionMiddleware = session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: "aevix.sid",
    cookie: {
      secure: secureCookie,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });

  app.use(sessionMiddleware);

  /* ── Inject Client ─────────────────────────────── */
  app.use((req, res, next) => {
    req.client = client;
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  /* ── Static Files ──────────────────────────────── */
  const staticOpts = { maxAge: "1h", etag: true };
  app.use("/css", express.static(path.join(__dirname, "public/css"), staticOpts));
  app.use("/js", express.static(path.join(__dirname, "public/js"), staticOpts));
  app.use("/assets", express.static(path.join(__dirname, "public/assets"), staticOpts));

  /* ── API Routes ────────────────────────────────── */
  app.use("/auth", require("./routes/auth"));
  app.use("/api/user", require("./routes/api/user"));
  app.use("/api/guilds", require("./routes/api/guilds"));
  app.use("/api/config", require("./routes/api/config"));
  app.use("/api/vote", require("./routes/api/vote"));
  app.use("/api/music", require("./routes/api/music"));

  /* ── Stats Endpoint ────────────────────────────── */
  app.get("/api/stats", async (req, res) => {
    try {
      let servers = 0, users = 0, players = 0, ping = client.ws.ping;
      if (client.cluster) {
        const stats = await client.cluster.broadcastEval((c) => ({
          guilds: c.guilds.cache.size,
          users: c.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
          players: c.manager?.players?.size || 0,
          ping: c.ws.ping || 0,
        }));
        servers = stats.reduce((a, s) => a + s.guilds, 0);
        users = stats.reduce((a, s) => a + s.users, 0);
        players = stats.reduce((a, s) => a + s.players, 0);
        ping = Math.round(stats.reduce((a, s) => a + s.ping, 0) / Math.max(stats.length, 1));
      } else {
        servers = client.guilds.cache.size;
        users = client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);
        players = client.manager?.players?.size || 0;
      }
      res.json({ status: "Operational", servers, users, players, commands: (client.commands?.size || 0) + (client.slashCommands?.size || 0), uptime: process.uptime(), ping });
    } catch (err) {
      res.json({ status: "Degraded", error: err.message });
    }
  });

  /* ── Debug Endpoint (owner-only) ───────────────── */
  app.get("/api/debug/auth", (req, res) => {
    if (!req.session?.user?.id || !client.config.ownerIds.includes(req.session.user.id)) {
      return res.status(403).json({ error: "Owner only" });
    }
    const cfg = client.config.dashboard;
    res.json({
      clientId: client.config.clientId,
      callbackUrl: cfg.callbackUrl,
      baseUrl: cfg.baseUrl,
      hasClientSecret: !!(cfg.clientSecret && cfg.clientSecret.length > 10),
      secretLength: cfg.clientSecret?.length || 0,
      secureCookie,
      sessionStore: "mongo",
      sessionExists: !!req.session,
      userId: req.session.user.id,
      oauthExists: !!req.session.oauth,
    });
  });

  /* ── Top.gg Vote Webhook ───────────────────────── */
  const whCfg = client.config.topggWebhook;
  if (whCfg?.auth) {
    const { recordVote, sendVoteThankYouDM } = require("../utils/topgg");
    app.post("/topgg/vote", (req, res) => {
      if (req.headers.authorization !== whCfg.auth) return res.status(401).json({ error: "Unauthorized" });
      const userId = req.body?.user;
      if (!userId) return res.status(400).json({ error: "Missing user" });
      client.logger.log(`[Top.gg] Vote webhook: ${userId}`, "vote");
      recordVote(userId).catch(() => null);
      sendVoteThankYouDM(client, userId).catch(() => null);
      res.json({ status: "ok" });
    });
  }

  /* ── Page Routes ───────────────────────────────── */
  const servePage = (f) => (_req, res) => res.sendFile(path.join(__dirname, "public", f));
  app.get("/", servePage("index.html"));
  app.get("/dashboard", servePage("dashboard.html"));
  app.get("/dashboard/:guildId", servePage("server.html"));
  app.get("/profile", servePage("profile.html"));
  app.get("/vote", servePage("vote.html"));
  app.get("/status", servePage("status.html"));
  app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, "public", "index.html")));

  /* ── Socket.IO ─────────────────────────────────── */
  io.use((socket, next) => sessionMiddleware(socket.request, {}, next));
  io.on("connection", (socket) => {
    const sess = socket.request.session;
    if (!sess?.user?.id) return socket.disconnect(true);
    socket.userId = sess.user.id;

    socket.on("join:guild", (guildId) => {
      if (typeof guildId === "string" && /^\d{17,20}$/.test(guildId)) socket.join(`guild:${guildId}`);
    });
    socket.on("leave:guild", (guildId) => socket.leave(`guild:${guildId}`));
    socket.on("music:action", async ({ guildId, action, data }) => {
      const player = client.manager?.players?.get(guildId);
      if (!player) return socket.emit("music:error", "No active player");
      try {
        await executeMusicAction(player, action, data);
        io.to(`guild:${guildId}`).emit("music:state", getPlayerState(client, guildId));
      } catch (err) { socket.emit("music:error", err.message); }
    });
  });

  const bcastInterval = setInterval(() => {
    if (!client.manager?.players?.size) return;
    for (const [guildId] of client.manager.players) {
      const room = io.sockets.adapter.rooms.get(`guild:${guildId}`);
      if (room?.size > 0) io.to(`guild:${guildId}`).emit("music:state", getPlayerState(client, guildId));
    }
  }, 5000);

  /* ── Start ─────────────────────────────────────── */
  httpServer.listen(config.port, () => {
    client.logger.log(`[Dashboard] Running at ${config.baseUrl}`, "ready");
    client.logger.log(`[Dashboard] Callback URL: ${config.callbackUrl}`, "log");
    client.logger.log(`[Dashboard] Secure cookies: ${secureCookie}`, "log");
  });

  httpServer.on("error", (err) => {
    client.logger.log(`[Dashboard] ${err.message}`, "error");
    clearInterval(bcastInterval);
  });

  client.dashboard = { io, app, httpServer };
}

/* ── Music Helpers ───────────────────────────────── */

function getPlayerState(client, guildId) {
  const player = client.manager?.players?.get(guildId);
  if (!player) return { active: false };
  const current = player.queue?.current || null;
  return {
    active: true, playing: !!player.playing, paused: !!player.paused,
    loop: player.loop || "none", volume: player.volume ?? 80,
    position: player.shoukaku?.position || 0, autoplay: !!player.data?.get("autoplay"),
    queueSize: player.queue?.size || 0,
    current: current ? { title: current.title, author: current.author, length: current.length, thumbnail: current.thumbnail, uri: current.uri, requester: current.requester?.username || "Autoplay" } : null,
    queue: [...(player.queue || [])].slice(0, 20).map((t) => ({ title: t.title, author: t.author, length: t.length })),
  };
}

async function executeMusicAction(player, action, data = {}) {
  switch (action) {
    case "pause": player.pause(true); break;
    case "resume": player.pause(false); break;
    case "skip": player.skip(); break;
    case "stop": player.queue.clear(); player.data?.delete("autoplay"); player.setLoop("none"); await player.shoukaku.stopTrack(); break;
    case "shuffle": player.queue.shuffle(); break;
    case "loop": { const m = ["none", "track", "queue"]; player.setLoop(m[(m.indexOf(player.loop || "none") + 1) % 3]); break; }
    case "volume": if (typeof data.volume === "number" && data.volume >= 0 && data.volume <= 150) player.setVolume(data.volume); break;
    case "autoplay": if (player.data) player.data.set("autoplay", !player.data.get("autoplay")); break;
    default: throw new Error("Unknown action");
  }
}

module.exports = { init, getPlayerState, executeMusicAction };