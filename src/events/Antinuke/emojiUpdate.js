/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "emojiUpdate",
  run: async (client, oldEmoji) => {
    await handleAntiNuke(client, oldEmoji.guild, "antiEmoji", 61, {
      label: "Emoji Update",
      fields: [{ name: "Emoji", value: oldEmoji.name || "Unknown" }],
    });
  },
};