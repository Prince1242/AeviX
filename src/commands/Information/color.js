/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "color",
  aliases: ["hex", "colour"],
  category: "Information",
  description: "View information about a hex color",
  usage: "<hex code>",
  args: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    let hex = args[0].replace("#", "").toUpperCase();

    /* Support 3-char shorthands */
    if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
      hex = hex.split("").map((c) => c + c).join("");
    }

    if (!/^[0-9A-Fa-f]{6}$/.test(hex))
      return message.reply(C.v2(C.fail("Provide a valid **hex color** (e.g. `#6C3AED` or `FF5733`).")));

    const colorInt = parseInt(hex, 16);

    /* Hex → RGB */
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    /* RGB → HSL */
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
        case gn: h = ((bn - rn) / d + 2) / 6; break;
        case bn: h = ((rn - gn) / d + 4) / 6; break;
      }
    }

    const hsl = `${Math.round(h * 360)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;

    /* Color preview using singlecolorimage.com */
    const previewUrl = `https://singlecolorimage.com/get/${hex}/400x100`;

    const container = C.container(colorInt)
      .addTextDisplayComponents(C.text(`### 🎨  Color · #${hex}`))
      .addSeparatorComponents(C.separator())
      .addMediaGalleryComponents(C.gallery(previewUrl))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Hex** · \`#${hex}\`\n` +
        `${e.dot} **RGB** · \`${r}, ${g}, ${b}\`\n` +
        `${e.dot} **HSL** · \`${hsl}\`\n` +
        `${e.dot} **Integer** · \`${colorInt}\`\n` +
        `${e.dot} **CSS** · \`rgb(${r}, ${g}, ${b})\``
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Information`));

    await message.reply(C.v2(container));
  },
};
