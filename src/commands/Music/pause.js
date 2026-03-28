/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "pause",
  aliases: [],
  category: "Music",
  description: "Pause the current track",
  cooldown: 2,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const player = client.manager.players.get(message.guildId);

    if (player.paused)
      return message.reply(C.v2(C.caution("Already paused. Use `" + prefix + "resume` to continue.")));

    player.pause(true);

    const container = C.container(COLORS.warn)
      .addTextDisplayComponents(C.text(
        `${MARK} ⏸️ **Paused**\n` +
        `-# ${player.queue.current?.title || "Unknown track"} · Use \`${prefix}resume\` to continue`
      ));

    await message.reply(C.v2(container));
  },
};
