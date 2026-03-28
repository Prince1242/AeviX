/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "skip",
  aliases: ["s", "sk", "next"],
  category: "Music",
  description: "Skip the current track",
  cooldown: 2,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);
    const track = player.queue.current;
    const title = track?.title ? (track.title.length > 50 ? track.title.slice(0, 50) + "…" : track.title) : "Unknown";
    const next = player.queue[0];

    player.skip();

    const lines = [`${MARK} ⏭️ Skipped **${title}**`];
    if (next) {
      lines.push(`-# Up next: **${next.title.length > 45 ? next.title.slice(0, 45) + "…" : next.title}**`);
    } else if (player.data?.get("autoplay")) {
      lines.push(`-# Autoplay will find the next track`);
    } else {
      lines.push(`-# Queue is empty`);
    }

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(lines.join("\n")));

    await message.reply(C.v2(container));
  },
};
