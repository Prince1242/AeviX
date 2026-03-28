/** @format */

const { convertTime } = require("../../utils/convert");
const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "grab",
  aliases: ["save", "dm"],
  category: "Music",
  description: "Save the current track info to your DMs",
  cooldown: 5,
  player: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);
    const track = player.queue.current;

    if (!track) return message.reply(C.v2(C.fail("Nothing is currently playing.")));

    const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;

    const body =
      `**${track.title}**\nby **${track.author}**\n\n` +
      `${e.dot} **Duration** · \`${track.isStream ? "LIVE" : convertTime(track.length)}\`\n` +
      `${e.dot} **Server** · ${message.guild.name}\n` +
      `${e.dot} **Requested by** · ${track.requester?.username || "Unknown"}`;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 💾  Saved Track`))
      .addSeparatorComponents(C.separator());

    if (thumb) {
      container.addSectionComponents(C.section(body, thumb));
    } else {
      container.addTextDisplayComponents(C.text(body));
    }

    if (track.uri) {
      container
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(C.row(C.btn.link("Listen", track.uri)));
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Music`));

    try {
      await message.author.send(C.v2(container));
      await message.reply(C.v2(C.ok("Track info sent to your **DMs**! 💾")));
    } catch {
      await message.reply(C.v2(C.fail("Couldn't DM you. Make sure your DMs are **open**.")));
    }
  },
};
