/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "guildBanRemove",
  run: async (client, ban) => {
    await handleAntiNuke(client, ban.guild, "antiUnban", 23, {
      label: "Unban",
      fields: [{ name: "Target", value: `${ban.user.tag} (\`${ban.user.id}\`)` }],
    });
  },
};