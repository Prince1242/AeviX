/** @format */

const Components = require("../../custom/components");
const { convertTime } = require("../../utils/convert");
const { paginate } = require("../../utils/paginator");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "queue",
  description: "View the current music queue",
  player: true,

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(interaction.guildId);
    const current = player.queue.current;

    if (!current)
      return interaction.reply(C.v2(C.fail("Nothing is currently playing.")));

    const loopLabels = { none: "Off", track: "Track", queue: "Queue" };
    const loopMode = loopLabels[player.loop || "none"] || "Off";
    const autoplay = player.data?.get("autoplay") ? "On" : "Off";
    const volume = player.volume ?? 80;

    /* ── Now playing header ──────────────────────── */
    const npLine =
      `${e.music} **Now Playing**\n` +
      `**${current.title}** by ${current.author}\n` +
      `\`${convertTime(player.shoukaku?.position || 0)}\` / \`${convertTime(current.length)}\`\n\n` +
      `${e.dot} Loop: \`${loopMode}\` · Autoplay: \`${autoplay}\` · Volume: \`${volume}%\``;

    if (player.queue.size === 0) {
      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Queue`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(npLine))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Queue is empty · use /play to add more`));

      return interaction.reply(C.v2(container));
    }

    /* ── Build queue items ───────────────────────── */
    const totalDuration = player.queue.reduce((a, t) => a + (t.length || 0), current.length || 0);

    const items = player.queue.map(
      (track, i) =>
        `\`${i + 1}.\` **${track.title}** · \`${convertTime(track.length)}\`\n` +
        `-# ${track.author} · ${track.requester?.username || "Autoplay"}`
    );

    /* Prepend NP + stats to first page */
    const header =
      `${npLine}\n\n` +
      `**Up Next** — \`${player.queue.size}\` track${player.queue.size !== 1 ? "s" : ""} · \`${convertTime(totalDuration)}\` total\n`;

    items[0] = `${header}\n${items[0]}`;

    await paginate(interaction, client, {
      items,
      perPage: 8,
      title: `${MARK}  Queue`,
      color: COLORS.brand,
      footer: FOOTER,
      userId: interaction.user.id,
    });
  },
};