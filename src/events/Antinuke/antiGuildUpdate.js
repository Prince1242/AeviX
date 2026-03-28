/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "guildUpdate",
  run: async (client, oldGuild) => {
    await handleAntiNuke(client, oldGuild, "antiGuildUpdate", 1, {
      label: "Guild Update",
    });
  },
};