/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "stickerCreate",
  run: async (client, sticker) => {
    await handleAntiNuke(client, sticker.guild, "antiSticker", 90, {
      label: "Sticker Creation",
      recover: () => sticker.delete().catch(() => null),
      fields: [{ name: "Sticker", value: `${sticker.name} (\`${sticker.id}\`)` }],
    });
  },
};