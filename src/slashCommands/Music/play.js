/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /play
 *  Search and play music. Uses player.search() for compatibility
 *  with Kazagumo's native search pipeline.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType } = require("discord.js");
const { convertTime } = require("../../utils/convert");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "play",
  description: "Play a song, playlist, or URL",
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "query",
      description: "Song name, URL, or playlist link",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "source",
      description: "Search engine to use",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "YouTube", value: "ytsearch" },
        { name: "YouTube Music", value: "ytmsearch" },
        { name: "Spotify", value: "spsearch" },
        { name: "SoundCloud", value: "scsearch" },
        { name: "Apple Music", value: "amsearch" },
        { name: "Deezer", value: "dzsearch" },
      ],
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const query = interaction.options.getString("query");
    const engine = interaction.options.getString("source") || undefined;
    const voiceId = interaction.member.voice.channelId;
    const guildId = interaction.guildId;

    /* ── Voice channel permissions ────────────────── */
    const vc = interaction.member.voice.channel;
    const perms = vc.permissionsFor(interaction.guild.members.me);
    if (!perms?.has("Connect"))
      return interaction.reply(C.v2(C.fail("I don't have permission to **join** your voice channel.")));
    if (!perms?.has("Speak"))
      return interaction.reply(C.v2(C.fail("I don't have permission to **speak** in your voice channel.")));

    await interaction.deferReply();

    /* ── Create or get player ────────────────────── */
    let player;
    try {
      player = await client.manager.createPlayer({
        guildId,
        voiceId,
        textId: interaction.channel.id,
        deaf: true,
        volume: 80,
      });
    } catch (err) {
      return interaction.editReply(C.v2(
        C.fail(`Failed to connect: ${err.message}`)
      ));
    }

    /* ── Search via player ───────────────────────── */
    let result;
    try {
      const searchOpts = { requester: interaction.user };
      if (engine) searchOpts.engine = engine;
      result = await player.search(query, searchOpts);
    } catch (err) {
      return interaction.editReply(C.v2(
        C.fail(`Search failed: ${err.message}`)
      ));
    }

    if (!result?.tracks?.length) {
      return interaction.editReply(C.v2(
        C.fail(`No results found for \`${query.substring(0, 80)}\`.`)
      ));
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
          `${e.dot} **Requested by** · ${interaction.user}\n` +
          `${e.dot} **Queue Size** · \`${player.queue.size}\``
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.editReply(C.v2(container));
    }

    /* ── Single Track ────────────────────────────── */
    const track = result.tracks[0];
    player.queue.add(track);
    if (!player.playing && !player.paused) player.play();

    const position = player.queue.size;
    const isPlaying = position === 0;
    const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;
    const title = track.title.length > 50 ? track.title.slice(0, 50) + "…" : track.title;

    /* If playing immediately — minimal response */
    if (isPlaying) {
      return interaction.editReply(C.v2(
        C.ok(`Now playing **${title}** by **${track.author}**`)
      ));
    }

    /* Queued — detailed card */
    const body =
      `**${title}**\nby **${track.author}**\n\n` +
      `${e.dot} **Duration** · \`${track.isStream ? "LIVE" : convertTime(track.length)}\`\n` +
      `${e.dot} **Position** · #\`${position}\` in queue\n` +
      `${e.dot} **Requested by** · ${interaction.user}`;

    const container = C.container(COLORS.base);

    if (thumb) {
      container.addSectionComponents(C.section(body, thumb));
    } else {
      container.addTextDisplayComponents(C.text(body));
    }

    await interaction.editReply(C.v2(container));
  },
};