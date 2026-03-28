/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "meme",
  aliases: ["reddit"],
  category: "Fun",
  description: "Get a random meme from Reddit",
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const subs = ["memes", "dankmemes", "me_irl", "wholesomememes", "ProgrammerHumor"];
    const sub = subs[Math.floor(Math.random() * subs.length)];

    try {
      const res = await fetch(`https://meme-api.com/gimme/${sub}`, {
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return message.reply(C.v2(C.fail("Failed to fetch meme. Try again.")));

      const data = await res.json();
      if (!data.url) return message.reply(C.v2(C.fail("No meme found. Try again.")));

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### 😂  ${data.title?.slice(0, 80) || "Meme"}`))
        .addSeparatorComponents(C.separator())
        .addMediaGalleryComponents(C.gallery(data.url))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **r/${data.subreddit}** · ⬆️ ${data.ups || 0}\n` +
          `-# ${MARK} Aevix Fun`
        ));

      await message.reply(C.v2(container));
    } catch {
      await message.reply(C.v2(C.fail("Failed to fetch meme. Try again.")));
    }
  },
};
