/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "guildBanAdd",
  run: async (client, ban) => {
    await handleAntiNuke(client, ban.guild, "antiBan", 22, {
      label: "Ban",
      fields: [{ name: "Target", value: `${ban.user.tag} (\`${ban.user.id}\`)` }],
    });
  },
};