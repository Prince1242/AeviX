/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Lavalink Node Event Loader
 * ══════════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const nodePath = path.join(__dirname, "../events/Node");

  if (!fs.existsSync(nodePath)) {
    client.logger.log("[LOADER] Node events directory missing", "warn");
    return;
  }

  let loaded = 0;

  for (const file of fs.readdirSync(nodePath).filter((f) => f.endsWith(".js"))) {
    try {
      const event = require(path.join(nodePath, file));
      if (!event.name || !event.run) {
        client.logger.log(`[LOADER] Skipping node event ${file} — missing name/run`, "warn");
        continue;
      }
      client.manager.shoukaku.on(event.name, (...args) => event.run(client, ...args));
      loaded++;
    } catch (err) {
      client.logger.log(`[LOADER] Failed to load node event ${file}: ${err.message}`, "error");
    }
  }

  client.logger.log(`Lavalink Node Events Loaded: ${loaded}`, "event");
};