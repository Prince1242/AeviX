/** @format */

const translate = require("@iamtraction/google-translate");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

const LANG_NAMES = { en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese", ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi", tr: "Turkish", nl: "Dutch", pl: "Polish", sv: "Swedish", da: "Danish", fi: "Finnish", no: "Norwegian", el: "Greek", th: "Thai", vi: "Vietnamese", id: "Indonesian", ms: "Malay", uk: "Ukrainian", cs: "Czech", ro: "Romanian", hu: "Hungarian", bg: "Bulgarian" };

module.exports = {
  name: "translate",
  aliases: ["tr", "trans"],
  category: "Information",
  description: "Translate text to another language",
  usage: "<language code> <text>",
  args: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    if (args.length < 2)
      return message.reply(C.v2(C.fail(`Format: \`${prefix}translate <lang> <text>\`\nExample: \`${prefix}translate es Hello world\`\nLanguages: \`${Object.keys(LANG_NAMES).join("\`, \`")}\``)));

    const targetLang = args[0].toLowerCase();
    const text = args.slice(1).join(" ");

    try {
      const result = await translate(text, { to: targetLang });

      const fromLang = LANG_NAMES[result.from.language.iso] || result.from.language.iso;
      const toLang = LANG_NAMES[targetLang] || targetLang;

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### 🌐  Translation`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**${fromLang}** → **${toLang}**\n\n` +
          `${e.dot} **Original**\n${text}\n\n` +
          `${e.dot} **Translated**\n${result.text}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Google Translate · Aevix Information`));

      await message.reply(C.v2(container));
    } catch (err) {
      await message.reply(C.v2(C.fail(`Translation failed. Make sure the language code is valid.\nUse \`${prefix}translate\` to see available codes.`)));
    }
  },
};
