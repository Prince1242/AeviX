/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "stickerUpdate",
  run: async (client, oldSticker) => {
    await handleAntiNuke(client, oldSticker.guild, "antiSticker", 91, {
      label: "Sticker Update",
      fields: [{ name: "Sticker", value: oldSticker.name }],
    });
  },
};