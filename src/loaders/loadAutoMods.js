/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — AutoMod Event Loader
 * ══════════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const automodPath = path.join(__dirname, "../events/AutoMod");

  if (!fs.existsSync(automodPath)) {
    client.logger.log("[LOADER] AutoMod events directory missing", "warn");
    return;
  }

  let loaded = 0;

  for (const file of fs.readdirSync(automodPath).filter((f) => f.endsWith(".js"))) {
    try {
      const event = require(path.join(automodPath, file));
      if (!event.name || !event.run) {
        client.logger.log(`[LOADER] Skipping automod ${file} — missing name/run`, "warn");
        continue;
      }
      client.on(event.name, (...args) => event.run(client, ...args));
      loaded++;
    } catch (err) {
      client.logger.log(`[LOADER] Failed to load automod ${file}: ${err.message}`, "error");
    }
  }

  client.logger.log(`AutoMod Events Loaded: ${loaded}`, "event");
};