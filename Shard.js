/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Cluster Manager (Shard Entry Point)
 *
 *  Spawns the bot using discord-hybrid-sharding.
 *  Run: node Shard.js
 * ══════════════════════════════════════════════════════════════════════ */

const config = require("./src/config");
const { ClusterManager } = require("discord-hybrid-sharding");

/* ── Branded Startup ─────────────────────────────── */
console.log("\x1b[36m");
console.log("    ╔═══════════════════════════════════╗");
console.log("    ║          A E V I X   B O T        ║");
console.log("    ║      Premium Discord Experience    ║");
console.log("    ╚═══════════════════════════════════╝");
console.log("\x1b[0m");

const manager = new ClusterManager("./index.js", {
  restarts: {
    max: 5,
    interval: 1000,
  },
  respawn: true,
  mode: "worker",
  token: config.token,
  totalShards: 1,
  shardsPerClusters: 1,
});

/* ── Cluster Events ──────────────────────────────── */

manager.on("clusterCreate", (cluster) => {
  console.log(
    `\x1b[32m[CLUSTER]\x1b[0m Launched cluster \x1b[36m#${cluster.id}\x1b[0m`
  );
});

manager.on("debug", (info) => {
  console.log(`${info}`, "cluster");
});

/* ── Spawn ───────────────────────────────────────── */

manager.spawn({ timeout: -1 });

/* ── Graceful Shutdown ───────────────────────────── */

const shutdown = (signal) => {
  console.log(`\n\x1b[33m[AEVIX] Received ${signal}, shutting down...\x1b[0m`);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));