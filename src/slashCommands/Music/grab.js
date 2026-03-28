/** @format */

const Components = require("../../custom/components");
const { convertTime } = require("../../utils/convert");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "grab",
  description: "Save the current track details to your DMs",
  player: true,

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(interaction.guildId);
    const track = player.queue.current;

    if (!track)
      return interaction.reply(C.v2(C.fail("Nothing is currently playing.")));

    const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;

    const body =
      `**${track.title}**\nby **${track.author}**\n\n` +
      `${e.dot} **Duration** · \`${convertTime(track.length)}\`\n` +
      `${e.dot} **Source** · ${track.sourceName || "Unknown"}\n` +
      `${e.dot} **Server** · ${interaction.guild.name}\n` +
      `${e.dot} **Requested by** · ${track.requester?.username || "Autoplay"}`;

    const dm = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${e.music}  Saved Track`))
      .addSeparatorComponents(C.separator());

    if (thumb) {
      dm.addSectionComponents(C.section(body, thumb));
    } else {
      dm.addTextDisplayComponents(C.text(body));
    }

    if (track.uri) {
      dm.addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(C.btn.link("Open Source", track.uri))
        );
    }

    dm.addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    try {
      await interaction.user.send(C.v2(dm));
      await interaction.reply(C.v2(
        C.ok("Track details sent to your **DMs**.")
      ));
    } catch {
      await interaction.reply(C.v2(
        C.fail("Couldn't send a DM. Make sure your DMs are **open**.")
      ));
    }
  },
};