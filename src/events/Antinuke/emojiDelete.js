/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "emojiDelete",
  run: async (client, emoji) => {
    await handleAntiNuke(client, emoji.guild, "antiEmoji", 62, {
      label: "Emoji Deletion",
      fields: [{ name: "Emoji", value: emoji.name || "Unknown" }],
    });
  },
};