/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "guildMemberRemove",
  run: async (client, member) => {
    await handleAntiNuke(client, member.guild, "antiKick", 20, {
      label: "Kick",
      targetCheck: (entry) => entry.target?.id === member.id,
      fields: [{ name: "Target", value: `${member.user.tag} (\`${member.id}\`)` }],
    });
  },
};