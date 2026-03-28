/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "channelCreate",
  run: async (client, channel) => {
    await handleAntiNuke(client, channel.guild, "antiChannel", 10, {
      label: "Channel Creation",
      recover: () => channel.delete().catch(() => null),
      fields: [{ name: "Channel", value: `${channel.name}` }],
    });
  },
};