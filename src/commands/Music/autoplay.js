/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "autoplay",
  aliases: ["ap"],
  category: "Music",
  description: "Toggle autoplay — plays similar tracks when queue ends",
  cooldown: 3,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const player = client.manager.players.get(message.guildId);

    const current = player.data?.get("autoplay") || false;
    const next = !current;

    player.data.set("autoplay", next);
    if (!next) player.data.set("autoplayHistory", []);

    const container = C.container(next ? COLORS.success : COLORS.warn)
      .addTextDisplayComponents(C.text(
        `${MARK} Autoplay **${next ? "enabled" : "disabled"}**\n` +
        `-# ${next ? "Similar tracks will play when the queue runs out" : "Playback will stop when the queue is empty"}`
      ));

    await message.reply(C.v2(container));
  },
};
