/** @format */

const fs = require("fs");
const path = require("path");

/* Files in events/Client/ that are loaded manually elsewhere */
const EXCLUDE = new Set(["PremiumChecks.js"]);

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "../events/Client");

  if (!fs.existsSync(eventsPath)) {
    client.logger.log("[LOADER] Client events directory missing", "warn");
    return;
  }

  let loaded = 0;

  for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith(".js"))) {
    if (EXCLUDE.has(file)) continue;

    try {
      const event = require(path.join(eventsPath, file));
      if (!event.name || !event.run) {
        client.logger.log(`[LOADER] Skipping client event ${file} — missing name/run`, "warn");
        continue;
      }
      client.on(event.name, (...args) => event.run(client, ...args));
      loaded++;
    } catch (err) {
      client.logger.log(`[LOADER] Failed to load client event ${file}: ${err.message}`, "error");
    }
  }

  client.logger.log(`Client Events Loaded: ${loaded}`, "event");
};