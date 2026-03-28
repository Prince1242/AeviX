/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "emojiCreate",
  run: async (client, emoji) => {
    await handleAntiNuke(client, emoji.guild, "antiEmoji", 60, {
      label: "Emoji Creation",
      recover: () => emoji.delete().catch(() => null),
      fields: [{ name: "Emoji", value: emoji.name }],
    });
  },
};