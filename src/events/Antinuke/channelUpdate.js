/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "channelUpdate",
  run: async (client, oldChannel, newChannel) => {
    await handleAntiNuke(client, oldChannel.guild, "antiChannel", 11, {
      label: "Channel Update",
      maxAge: 5000,
      recover: async () => {
        if (oldChannel.name !== newChannel.name)
          await newChannel.edit({ name: oldChannel.name }).catch(() => null);
        if (oldChannel.topic !== undefined && oldChannel.topic !== newChannel.topic)
          await newChannel.setTopic(oldChannel.topic).catch(() => null);
      },
      fields: [{ name: "Channel", value: `${oldChannel.name} (\`${oldChannel.id}\`)` }],
    });
  },
};