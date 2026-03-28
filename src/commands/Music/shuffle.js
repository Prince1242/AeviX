/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "shuffle",
  aliases: ["sh", "mix"],
  category: "Music",
  description: "Shuffle the queue",
  cooldown: 3,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const player = client.manager.players.get(message.guildId);

    if (player.queue.size < 2)
      return message.reply(C.v2(C.fail("Need at least **2 tracks** in queue to shuffle.")));

    player.queue.shuffle();

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(
        `${MARK} 🔀 Shuffled **${player.queue.size}** tracks\n` +
        `-# Up next: **${player.queue[0]?.title?.slice(0, 45) || "Unknown"}**`
      ));

    await message.reply(C.v2(container));
  },
};
