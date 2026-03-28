/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "guildMemberUpdate",
  run: async (client, oldMember) => {
    await handleAntiNuke(client, oldMember.guild, "antiMemberUpdate", 24, {
      label: "Member Update",
    });
  },
};