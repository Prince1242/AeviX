/** @format */

const { convertTime, convertHmsToMs } = require("../../utils/convert");
const { progressbar } = require("../../utils/playerUtils");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "seek",
  aliases: [],
  category: "Music",
  description: "Seek to a position in the current track",
  usage: "<time (e.g. 1:30, 90)>",
  args: true,
  cooldown: 3,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);
    const track = player.queue.current;

    if (!track) return message.reply(C.v2(C.fail("Nothing is playing.")));
    if (track.isStream) return message.reply(C.v2(C.fail("Cannot seek in a **live stream**.")));

    /* Parse input — supports "1:30", "01:30", "90" (seconds) */
    let seekMs;
    if (args[0].includes(":")) {
      seekMs = convertHmsToMs(args[0]);
    } else {
      const secs = parseInt(args[0]);
      if (isNaN(secs)) return message.reply(C.v2(C.fail("Invalid time format. Use `1:30` or `90`.")));
      seekMs = secs * 1000;
    }

    if (seekMs < 0 || seekMs > track.length)
      return message.reply(C.v2(C.fail(`Must be between \`00:00\` and \`${convertTime(track.length)}\`.`)));

    await player.shoukaku.seekTo(seekMs);

    /* Build visual preview */
    const size = 18;
    const progress = Math.min(Math.round(size * (seekMs / track.length)), size);
    const bar = "▬".repeat(progress) + "🔘" + "▬".repeat(Math.max(0, size - progress - 1));

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(
        `${MARK} Seeked to **${convertTime(seekMs)}**\n` +
        `\`${convertTime(seekMs)}\` ${bar} \`${convertTime(track.length)}\``
      ));

    await message.reply(C.v2(container));
  },
};
