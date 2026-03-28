/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "replay",
  aliases: ["restart"],
  category: "Music",
  description: "Replay the current track from the beginning",
  cooldown: 3,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const player = client.manager.players.get(message.guildId);
    const track = player.queue.current;

    if (!track) return message.reply(C.v2(C.fail("Nothing is currently playing.")));
    if (track.isStream) return message.reply(C.v2(C.fail("Cannot replay a **live stream**.")));

    await player.shoukaku.seekTo(0);

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(
        `${MARK} 🔄 Replaying **${track.title.length > 50 ? track.title.slice(0, 50) + "…" : track.title}**\n` +
        `-# Seeked to 00:00`
      ));

    await message.reply(C.v2(container));
  },
};
