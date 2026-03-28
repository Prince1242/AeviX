/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "loop",
  aliases: ["lp", "repeat"],
  category: "Music",
  description: "Toggle loop mode (off → track → queue)",
  usage: "[off|track|queue]",
  cooldown: 2,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const player = client.manager.players.get(message.guildId);

    const modes = ["none", "track", "queue"];
    const labels = { none: "Off", track: "🔂 Track", queue: "🔁 Queue" };
    const colors = { none: COLORS.base, track: COLORS.brand, queue: COLORS.success };

    let next;
    if (args.length) {
      const input = args[0].toLowerCase();
      const map = { off: "none", disable: "none", track: "track", song: "track", queue: "queue", all: "queue" };
      next = map[input];
      if (!next) return message.reply(C.v2(C.fail("Valid modes: `off`, `track`, `queue`")));
    } else {
      const cur = modes.indexOf(player.loop || "none");
      next = modes[(cur + 1) % modes.length];
    }

    player.setLoop(next);

    const container = C.container(colors[next])
      .addTextDisplayComponents(C.text(
        `${MARK} Loop: **${labels[next]}**\n` +
        `-# ${next === "none" ? "Playback will continue normally" : next === "track" ? "Current track will repeat" : "Entire queue will repeat"}`
      ));

    await message.reply(C.v2(container));
  },
};
