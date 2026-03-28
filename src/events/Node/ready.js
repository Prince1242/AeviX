/** @format */

const db = require("../../schema/247");

module.exports = {
  name: "ready",
  run: async (client, name) => {
    client.logger.log(`Lavalink "${name}" connected`, "ready");
    client.logger.log("Collecting 24/7 auto-reconnect data...", "log");

    const maindata = await db.find();
    client.logger.log(
      `Auto-Reconnect: Found ${maindata.length} queue${maindata.length !== 1 ? "s" : ""}${maindata.length ? " — resuming all" : ""}`,
      "ready"
    );

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    for (const data of maindata) {
      try {
        const channel = client.channels.cache.get(data.TextId);
        const voice = client.channels.cache.get(data.VoiceId);

        if (!channel || !voice) {
          client.logger.log(
            `Auto-Reconnect: Channels not found for guild ${data.Guild}. Cleaning up.`,
            "warn"
          );
          await data.deleteOne().catch(() => null);
          continue;
        }

        /* Check permissions */
        const guild = voice.guild;
        const botMember = guild?.members.cache.get(client.user.id);
        if (!botMember) {
          await data.deleteOne().catch(() => null);
          continue;
        }

        const perms = voice.permissionsFor(botMember);
        if (!perms?.has(["Connect", "Speak"])) {
          client.logger.log(
            `Auto-Reconnect: Missing permissions in guild ${data.Guild}. Cleaning up.`,
            "warn"
          );
          await data.deleteOne().catch(() => null);
          continue;
        }

        /* Check if player already exists */
        let player = client.manager.players.get(data.Guild);
        if (player) {
          try {
            player.setVoiceChannel(data.VoiceId);
          } catch {}
        } else {
          /* Create with retry logic */
          let attempt = 0;
          let created = false;
          const maxAttempts = 3;

          while (attempt < maxAttempts && !created) {
            attempt++;
            try {
              player = await client.manager.createPlayer({
                guildId: data.Guild,
                voiceId: data.VoiceId,
                textId: data.TextId,
                deaf: true,
                volume: 80,
              });
              created = true;
            } catch (e) {
              client.logger.log(
                `Auto-Reconnect: Attempt ${attempt}/${maxAttempts} failed for guild ${data.Guild}: ${e.message}`,
                "warn"
              );
              await sleep(500 * attempt + Math.floor(Math.random() * 300));
            }
          }

          if (!created) {
            client.logger.log(
              `Auto-Reconnect: Failed after ${maxAttempts} attempts for guild ${data.Guild}`,
              "error"
            );
            continue;
          }
        }

        client.logger.log(
          `Auto-Reconnect: Reconnected to ${voice.name} in ${guild.name}`,
          "ready"
        );

        /* Start health monitoring */
        if (client.voiceHealthMonitor && player) {
          client.voiceHealthMonitor.startMonitoring(player);
        }

        /* Stagger between connections */
        await sleep(Math.floor(Math.random() * 500) + 500);
      } catch (error) {
        if (
          error.message?.includes("missing connection endpoint") ||
          error.message?.includes("Session not found")
        ) {
          client.logger.log(
            `Auto-Reconnect: Voice connection failed for guild ${data.Guild}. Cleaning up.`,
            "warn"
          );
          await data.deleteOne().catch(() => null);
        } else {
          client.logger.log(
            `Auto-Reconnect: Error for guild ${data.Guild}: ${error.message}`,
            "error"
          );
        }
      }
    }
  },
};