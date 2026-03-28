/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "channelDelete",
  run: async (client, channel) => {
    await handleAntiNuke(client, channel.guild, "antiChannel", 12, {
      label: "Channel Deletion",
      recover: async () => {
        const cloned = await channel.clone().catch(() => null);
        if (cloned) {
          await cloned.setPosition(channel.position).catch(() => null);
          if (channel.parentId) await cloned.setParent(channel.parentId).catch(() => null);
        }
      },
      fields: [{ name: "Channel", value: `#${channel.name} (\`${channel.id}\`)` }],
    });
  },
};