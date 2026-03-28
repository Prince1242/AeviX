/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "volume",
  aliases: ["vol", "v"],
  category: "Music",
  description: "Set the player volume (0-150)",
  usage: "<0-150>",
  cooldown: 2,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);

    /* Show current volume if no args */
    if (!args.length) {
      const vol = player.volume ?? 80;
      const blocks = Math.round(vol / 10);
      const bar = "█".repeat(blocks) + "░".repeat(Math.max(0, 15 - blocks));
      const icon = vol === 0 ? "🔇" : vol < 30 ? "🔈" : vol < 70 ? "🔉" : "🔊";

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(
          `### ${e.volume}  Volume\n\n` +
          `${icon} \`${bar}\` **${vol}%**\n\n` +
          `-# Use \`${prefix}volume <0-150>\` to change`
        ));

      return message.reply(C.v2(container));
    }

    const vol = parseInt(args[0]);
    if (isNaN(vol) || vol < 0 || vol > 150)
      return message.reply(C.v2(C.fail("Volume must be between **0** and **150**.")));

    player.setVolume(vol);

    const blocks = Math.round(vol / 10);
    const bar = "█".repeat(Math.min(blocks, 15)) + "░".repeat(Math.max(0, 15 - blocks));
    const icon = vol === 0 ? "🔇" : vol < 30 ? "🔈" : vol < 70 ? "🔉" : "🔊";
    const color = vol === 0 ? COLORS.muted : vol <= 100 ? COLORS.success : COLORS.warn;

    const container = C.container(color)
      .addTextDisplayComponents(C.text(
        `${MARK} ${icon} Volume set to **${vol}%**\n` +
        `\`${bar}\`${vol > 100 ? "\n-# ⚠️ Volume above 100% may cause distortion" : ""}`
      ));

    await message.reply(C.v2(container));
  },
};
