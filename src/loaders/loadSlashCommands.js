/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Slash Command Loader
 * ══════════════════════════════════════════════════════════════════════ */

const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const slashPath = path.join(__dirname, "../slashCommands");

  if (!fs.existsSync(slashPath)) {
    client.logger.log("[LOADER] Slash commands directory missing", "warn");
    return;
  }

  const data = [];
  let loaded = 0;
  let failed = 0;

  for (const dir of fs.readdirSync(slashPath)) {
    const dirPath = path.join(slashPath, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      try {
        const cmd = require(path.join(dirPath, file));
        if (!cmd.name || !cmd.description) {
          client.logger.log(`[LOADER] Skipping slash ${dir}/${file} — missing name/description`, "warn");
          continue;
        }

        client.slashCommands.set(cmd.name, cmd);
        data.push({
          name: cmd.name,
          description: cmd.description,
          options: cmd.options || [],
          dm_permission: cmd.dm_permission ?? false,
          default_member_permissions: cmd.default_member_permissions || null,
        });

        loaded++;
      } catch (err) {
        client.logger.log(`[LOADER] Failed to load slash ${dir}/${file}: ${err.message}`, "error");
        failed++;
      }
    }
  }

  client.slashCommandData = data;
  client.logger.log(
    `Slash Commands Loaded: ${loaded}${failed ? ` (${failed} failed)` : ""}`,
    "cmd"
  );
};