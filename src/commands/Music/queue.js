/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — queue (prefix)
 *
 *  Paginated queue with current track progress bar, total duration,
 *  and per-track numbering.
 * ══════════════════════════════════════════════════════════════════ */

const { convertTime } = require("../../utils/convert");
const { progressbar } = require("../../utils/playerUtils");
const { paginate } = require("../../utils/paginator");
const Components = require("../../custom/components");

const { MARK, COLORS } = Components;

module.exports = {
  name: "queue",
  aliases: ["q"],
  category: "Music",
  description: "View the current track queue",
  cooldown: 3,
  player: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);
    const track = player.queue.current;

    if (!track)
      return message.reply(C.v2(C.fail("Nothing is currently playing.")));

    const position = player.shoukaku?.position || 0;
    const bar = progressbar(player, { size: 15 });
    const queueTracks = [...player.queue];
    const totalDuration = queueTracks.reduce((a, t) => a + (t.length || 0), 0) + (track.length || 0);

    /* ── Now playing header (shown on every page) ── */
    const nowPlaying =
      `${e.music} **Now:** ${track.title.length > 45 ? track.title.slice(0, 45) + "…" : track.title}\n` +
      `\`${convertTime(position)}\` ${bar} \`${track.isStream ? "LIVE" : convertTime(track.length)}\``;

    if (!queueTracks.length) {
      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${e.queue}  Queue — 1 track`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(nowPlaying))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} No upcoming tracks · Use \`${prefix}play\` to add more`));

      return message.reply(C.v2(container));
    }

    /* ── Build queue items ───────────────────────── */
    const items = queueTracks.map((t, i) => {
      const dur = t.isStream ? "LIVE" : convertTime(t.length);
      const name = t.title.length > 42 ? t.title.slice(0, 42) + "…" : t.title;
      return `\`${i + 1}.\` **${name}** — \`${dur}\`\n-# ${t.author} · ${t.requester?.username || "Unknown"}`;
    });

    const loopLabels = { none: "Off", track: "Track", queue: "Queue" };
    const loopMode = loopLabels[player.loop || "none"] || "Off";
    const autoplay = player.data?.get("autoplay") ? "On" : "Off";

    await paginate(message, client, {
      items,
      perPage: 8,
      title: `${e.queue}  Queue — ${queueTracks.length + 1} tracks (${convertTime(totalDuration)})`,
      color: COLORS.brand,
      footer: `${nowPlaying}\n\n-# ${MARK} Loop: ${loopMode} · Autoplay: ${autoplay} · Volume: ${player.volume ?? 80}%`,
      userId: message.author.id,
    });
  },
};
