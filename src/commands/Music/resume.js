/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "resume",
  aliases: ["r", "unpause"],
  category: "Music",
  description: "Resume the paused track",
  cooldown: 2,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const player = client.manager.players.get(message.guildId);

    if (!player.paused)
      return message.reply(C.v2(C.caution("Already playing.")));

    player.pause(false);

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(
        `${MARK} ▶️ **Resumed**\n` +
        `-# ${player.queue.current?.title || "Unknown track"}`
      ));

    await message.reply(C.v2(container));
  },
};
