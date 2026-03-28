/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — play (prefix)
 *
 *  Search & play music with advanced UI. Supports URLs, playlists,
 *  and text search with source selection.
 * ══════════════════════════════════════════════════════════════════ */

const { convertTime } = require("../../utils/convert");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "play",
  aliases: ["p"],
  category: "Music",
  description: "Play a song, URL, or playlist",
  usage: "<song name or URL>",
  args: true,
  cooldown: 2,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const query = args.join(" ");
    const voiceId = message.member.voice.channelId;
    const guildId = message.guildId;

    /* ── Voice channel permissions ────────────────── */
    const vc = message.member.voice.channel;
    const perms = vc.permissionsFor(message.guild.members.me);
    if (!perms?.has("Connect"))
      return message.reply(C.v2(C.fail("I don't have permission to **join** your voice channel.")));
    if (!perms?.has("Speak"))
      return message.reply(C.v2(C.fail("I don't have permission to **speak** in your voice channel.")));

    /* ── Loading indicator ───────────────────────── */
    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`${e.loading} Searching for **${query.length > 60 ? query.slice(0, 60) + "…" : query}**...`))
    ));

    /* ── Create or get player ────────────────────── */
    let player;
    try {
      player = await client.manager.createPlayer({
        guildId,
        voiceId,
        textId: message.channel.id,
        deaf: true,
        volume: 80,
      });
    } catch (err) {
      return loadMsg.edit(C.v2(C.fail(`Failed to connect: ${err.message}`)));
    }

    /* ── Search ──────────────────────────────────── */
    let result;
    try {
      result = await player.search(query, { requester: message.author });
    } catch (err) {
      return loadMsg.edit(C.v2(C.fail(`Search failed: ${err.message}`)));
    }

    if (!result?.tracks?.length) {
      return loadMsg.edit(C.v2(C.fail(`No results found for \`${query.substring(0, 80)}\`.`)));
    }

    /* ── Playlist ────────────────────────────────── */
    if (result.type === "PLAYLIST") {
      for (const track of result.tracks) player.queue.add(track);
      if (!player.playing && !player.paused) player.play();

      const dur = result.tracks.reduce((a, t) => a + (t.length || 0), 0);

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${e.queue}  Playlist Queued`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**${result.playlistName || "Unknown Playlist"}**\n\n` +
          `${e.dot} **Tracks** · \`${result.tracks.length}\`\n` +
          `${e.dot} **Duration** · \`${convertTime(dur)}\`\n` +
          `${e.dot} **Requested by** · ${message.author}\n` +
          `${e.dot} **Queue Size** · \`${player.queue.size}\``
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Music`));

      return loadMsg.edit(C.v2(container));
    }

    /* ── Single Track ────────────────────────────── */
    const track = result.tracks[0];
    player.queue.add(track);
    if (!player.playing && !player.paused) player.play();

    const position = player.queue.size;
    const isPlaying = position === 0;
    const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;
    const title = track.title.length > 50 ? track.title.slice(0, 50) + "…" : track.title;

    /* If playing immediately — rich now-playing */
    if (isPlaying) {
      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${e.play}  Now Playing`))
        .addSeparatorComponents(C.separator());

      const body =
        `**${title}**\nby **${track.author}**\n\n` +
        `${e.dot} **Duration** · \`${track.isStream ? "🔴 LIVE" : convertTime(track.length)}\`\n` +
        `${e.dot} **Requested by** · ${message.author}`;

      if (thumb) {
        container.addSectionComponents(C.section(body, thumb));
      } else {
        container.addTextDisplayComponents(C.text(body));
      }

      container
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Music · ${prefix}np for controls`));

      return loadMsg.edit(C.v2(container));
    }

    /* Queued — detailed card */
    const body =
      `**${title}**\nby **${track.author}**\n\n` +
      `${e.dot} **Duration** · \`${track.isStream ? "🔴 LIVE" : convertTime(track.length)}\`\n` +
      `${e.dot} **Position** · #\`${position}\` in queue\n` +
      `${e.dot} **Requested by** · ${message.author}`;

    const container = C.container(COLORS.base)
      .addTextDisplayComponents(C.text(`### ${e.addsong}  Added to Queue`))
      .addSeparatorComponents(C.separator());

    if (thumb) {
      container.addSectionComponents(C.section(body, thumb));
    } else {
      container.addTextDisplayComponents(C.text(body));
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Music`));

    await loadMsg.edit(C.v2(container));
  },
};
