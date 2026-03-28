/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "stickerDelete",
  run: async (client, sticker) => {
    await handleAntiNuke(client, sticker.guild, "antiSticker", 92, {
      label: "Sticker Deletion",
      fields: [{ name: "Sticker", value: `${sticker.name} (\`${sticker.id}\`)` }],
    });
  },
};