/** @format */

const { ActivityType } = require("discord.js");
const deploySlashCommands = require("../../utils/deploySlashCommands");

module.exports = {
  name: "ready",
  run: async (client) => {
    const userCount = client.guilds.cache.reduce(
      (a, g) => a + g.memberCount,
      0
    );

    client.logger.log(`${client.user.username} online!`, "ready");
    client.logger.log(
      `Serving ${client.guilds.cache.size} servers | ${client.numb(userCount)} users`,
      "ready"
    );
    client.logger.log(
      `Prefix: ${client.prefix} | Commands: ${client.commands.size} | Slash: ${client.slashCommands.size}`,
      "ready"
    );

    await deploySlashCommands(client);

    /* ── Rotating status ─────────────────────────── */

    /* FIX: Clear previous interval to prevent duplicates on reconnect */
    if (client._statusInterval) {
      clearInterval(client._statusInterval);
      client._statusInterval = null;
    }

    let idx = 0;

    const updateStatus = () => {
      /* FIX: Recalculate counts each cycle so status stays fresh */
      const users = client.guilds.cache.reduce(
        (a, g) => a + g.memberCount,
        0
      );
      const servers = client.guilds.cache.size;

      const statuses = [
        {
          text: `${client.prefix}help | ${client.prefix}play`,
          type: ActivityType.Listening,
        },
        {
          text: `${client.numb(users)} users`,
          type: ActivityType.Watching,
        },
        { text: `${servers} servers`, type: ActivityType.Watching },
        { text: "aevix.gg", type: ActivityType.Competing },
      ];

      const s = statuses[idx % statuses.length];
      client.user.setActivity(s.text, { type: s.type });
      idx++;
    };

    updateStatus();
    client._statusInterval = setInterval(updateStatus, 15_000);
  },
};