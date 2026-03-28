/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Bot Entry Point (per-cluster)
 *
 *  Created by Prince — Refactored for premium quality.
 * ══════════════════════════════════════════════════════════════════════ */

const { Collection } = require("discord.js");
const MusicBot = require("./src/structures/MusicClient");
const Dokdo = require("dokdo");
const Util = require("./src/utils/util");
const { Api } = require("@top-gg/sdk");

const OWNER_IDS = ["971329961313046578"];

const client = new MusicBot();
client.util = new Util(client);
module.exports = client;

/* ── Connect to Discord ──────────────────────────── */
client.connect();

/* ── Dokdo (eval/debug tool, owner-only) ─────────── */
client.Jsk = new Dokdo.Client(client, {
  aliases: ["dokdo", "dok", "jsk"],
  prefix: "?",
  owners: OWNER_IDS,
});

process.env.SHELL = process.platform === "win32" ? "powershell" : "bash";

/* ── Client-level state ──────────────────────────── */
client.userSettings = new Collection();
client.color = "2b2d31";

/* ── Top.gg API Client ───────────────────────────── */
try {
  const topggToken = client.config.topgg;
  if (topggToken && topggToken !== "here") {
    client.topgg = new Api(topggToken);
    client.logger.log("[Top.gg] API client initialized", "ready");
  } else {
    client.topgg = null;
    client.logger.log("[Top.gg] No API token — vote features disabled", "warn");
  }
} catch (err) {
  client.topgg = null;
  client.logger.log(`[Top.gg] API init failed: ${err.message}`, "error");
}

/* ── Dokdo Message Handler ───────────────────────── */
client.on("messageCreate", (message) => {
  client.Jsk.run(message);
});

/* ── Global Error Handlers ───────────────────────── */

process.on("unhandledRejection", (reason, promise) => {
  /* FIX: Log meaningful error info instead of raw object dump */
  const msg =
    reason instanceof Error
      ? `${reason.message}\n${reason.stack}`
      : String(reason);
  client.logger.log(`[UNHANDLED REJECTION] ${msg}`, "error");
});

process.on("uncaughtException", (err, origin) => {
  client.logger.log(
    `[UNCAUGHT EXCEPTION] ${err.message}\n${err.stack}\nOrigin: ${origin}`,
    "error"
  );
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  client.logger.log(
    `[EXCEPTION MONITOR] ${err.message} | Origin: ${origin}`,
    "warn"
  );
});