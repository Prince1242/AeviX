/** @format */

const Components = require("../../custom/components");
const { safeDestroyPlayer } = require("../../utils/playerUtils");
const { MARK, COLORS } = Components;

module.exports = {
  name: "stop",
  aliases: ["dc", "disconnect", "leave"],
  category: "Music",
  description: "Stop playback, clear queue, and disconnect",
  cooldown: 3,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const player = client.manager.players.get(message.guildId);

    const trackCount = player.queue.size;
    player.queue.clear();
    player.data?.delete("autoplay");
    player.setLoop("none");
    await player.shoukaku.stopTrack();
    await safeDestroyPlayer(player);

    const container = C.container(COLORS.error)
      .addTextDisplayComponents(C.text(
        `${MARK} ⏹️ **Stopped & Disconnected**\n` +
        `-# Cleared ${trackCount} track${trackCount !== 1 ? "s" : ""} from queue`
      ));

    await message.reply(C.v2(container));
  },
};
