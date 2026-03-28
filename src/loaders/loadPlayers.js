/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Player Event Loader
 *
 *  CRITICAL FIX: Removed playerClosed → playerError aliasing.
 *  Shoukaku v4 handles voice WebSocket close events internally for
 *  reconnection. Our handler was intercepting these and breaking
 *  the voice connection, causing silent audio.
 * ══════════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const playerPath = path.join(__dirname, "../events/Players");

  if (!fs.existsSync(playerPath)) {
    client.logger.log("[LOADER] Player events directory missing", "warn");
    return;
  }

  let loaded = 0;

  for (const file of fs.readdirSync(playerPath).filter((f) => f.endsWith(".js"))) {
    try {
      const event = require(path.join(playerPath, file));
      if (!event.name || !event.run) {
        client.logger.log(`[LOADER] Skipping player event ${file} — missing name/run`, "warn");
        continue;
      }

      client.manager.on(event.name, (...args) => event.run(client, ...args));
      loaded++;
    } catch (err) {
      client.logger.log(`[LOADER] Failed to load player event ${file}: ${err.message}`, "error");
    }
  }

  client.logger.log(`Player Events Loaded: ${loaded}`, "event");
};