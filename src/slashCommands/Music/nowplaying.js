/** @format */

const Components = require("../../custom/components");
const { convertTime } = require("../../utils/convert");
const { progressbar } = require("../../utils/playerUtils");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "nowplaying",
  description: "Show details about the current track",
  player: true,

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(interaction.guildId);
    const track = player.queue.current;

    if (!track)
      return interaction.reply(C.v2(C.fail("Nothing is currently playing.")));

    const position = player.shoukaku?.position || 0;
    const total = track.length || 0;
    const bar = progressbar(player, { size: 18 });
    const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;
    const requester = track.requester?.username || "Autoplay";

    const loopLabels = { none: "Off", track: "Track", queue: "Queue" };
    const loopMode = loopLabels[player.loop || "none"] || "Off";
    const autoplay = player.data?.get("autoplay") ? "On" : "Off";
    const volume = player.volume ?? 80;
    const paused = player.paused;

    const body =
      `**${track.title}**\nby **${track.author}**\n\n` +
      `\`${convertTime(position)}\` ${bar} \`${convertTime(total)}\`\n\n` +
      `${e.dot} **Status** · ${paused ? "⏸️ Paused" : "▶️ Playing"}\n` +
      `${e.dot} **Volume** · \`${volume}%\`\n` +
      `${e.dot} **Loop** · \`${loopMode}\`\n` +
      `${e.dot} **Autoplay** · \`${autoplay}\`\n` +
      `${e.dot} **Requested by** · ${requester}\n` +
      `${e.dot} **Queue** · \`${player.queue.size}\` track${player.queue.size !== 1 ? "s" : ""} remaining`;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${e.music}  Now Playing`))
      .addSeparatorComponents(C.separator());

    if (thumb) {
      container.addSectionComponents(C.section(body, thumb));
    } else {
      container.addTextDisplayComponents(C.text(body));
    }

    if (track.uri) {
      container
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(C.btn.link("Open Source", track.uri))
        );
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.reply(C.v2(container));
  },
};