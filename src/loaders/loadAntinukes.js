/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Antinuke Event Loader
 * ══════════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const antiNukePath = path.join(__dirname, "../events/Antinuke");

  if (!fs.existsSync(antiNukePath)) {
    client.logger.log("[LOADER] Antinuke events directory missing", "warn");
    return;
  }

  let loaded = 0;

  for (const file of fs.readdirSync(antiNukePath).filter((f) => f.endsWith(".js"))) {
    try {
      const event = require(path.join(antiNukePath, file));
      if (!event.name || !event.run) {
        client.logger.log(`[LOADER] Skipping antinuke ${file} — missing name/run`, "warn");
        continue;
      }
      client.on(event.name, (...args) => event.run(client, ...args));
      loaded++;
    } catch (err) {
      client.logger.log(`[LOADER] Failed to load antinuke ${file}: ${err.message}`, "error");
    }
  }

  client.logger.log(`Antinuke Events Loaded: ${loaded}`, "event");
};