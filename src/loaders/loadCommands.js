/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Prefix Command Loader
 * ══════════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "../commands");

  if (!fs.existsSync(commandsPath)) {
    client.logger.log("[LOADER] Commands directory missing", "warn");
    return;
  }

  let loaded = 0;
  let failed = 0;

  for (const dir of fs.readdirSync(commandsPath)) {
    const dirPath = path.join(commandsPath, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      try {
        const command = require(path.join(dirPath, file));
        if (!command.name) {
          client.logger.log(`[LOADER] Skipping ${dir}/${file} — missing name`, "warn");
          continue;
        }

        client.commands.set(command.name, command);

        if (command.aliases?.length) {
          for (const alias of command.aliases) {
            client.aliases.set(alias, command.name);
          }
        }

        loaded++;
      } catch (err) {
        client.logger.log(`[LOADER] Failed to load ${dir}/${file}: ${err.message}`, "error");
        failed++;
      }
    }
  }

  client.logger.log(
    `Prefix Commands Loaded: ${loaded}${failed ? ` (${failed} failed)` : ""}`,
    "cmd"
  );
};