/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Slash Command Deployer
 *
 *  Registers all loaded slash commands with Discord's API.
 *  Called once when the bot is ready.
 * ══════════════════════════════════════════════════════════════════════ */

const { REST, Routes } = require("discord.js");

async function deploySlashCommands(client) {
  if (!client.slashCommandData?.length) {
    client.logger.log("[SLASH] No slash commands to deploy", "warn");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(client.token);
  const startTime = Date.now();

  try {
    client.logger.log(
      `[SLASH] Deploying ${client.slashCommandData.length} application (/) commands...`,
      "log"
    );

    const data = await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: client.slashCommandData }
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    client.logger.log(
      `[SLASH] Successfully deployed ${data.length} commands (${elapsed}s)`,
      "ready"
    );
  } catch (error) {
    client.logger.log(
      `[SLASH] Deployment failed: ${error.message || error}`,
      "error"
    );

    /* Log rate limit info if available */
    if (error.status === 429) {
      client.logger.log(
        `[SLASH] Rate limited — retry after ${error.retry_after || "unknown"}s`,
        "warn"
      );
    }
  }
}

module.exports = deploySlashCommands;