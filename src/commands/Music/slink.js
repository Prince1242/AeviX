/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — slink (Premium Spotify Link Metadata)
 *
 *  Searches and displays an interactive, aesthetic info card for 
 *  any Spotify track/playlist without adding it to the queue.
 * ══════════════════════════════════════════════════════════════════ */

const { convertTime } = require("../../utils/convert");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "slink",
  aliases: ["sinfo", "spotifyinfo"],
  category: "Music",
  description: "View rich metadata for a Spotify link/query without playing it",
  usage: "<song name or Spotify URL>",
  args: true,
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const query = args.join(" ");

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.spotify)
        .addTextDisplayComponents(C.text(`${e.loading} Fetching Spotify metadata for **${query.length > 60 ? query.slice(0, 60) + "…" : query}**...`))
    ));

    /* ── Need a dummy player just for search (if manager doesn't expose it globally) 
        Or we can just create a temporary player or use a node directly.
        Wait, we changed the player bug — client.manager.search works if we pass it right,
        but since we reverted to player.search per user comment, we must create a dummy player.
        Actually, Kazagumo search can be called as client.manager.search globally in most setups. 
        Let's try standard createPlayer just in case it's strictly bound. ── */

    let player = client.manager.players.get(message.guild.id);
    let createdDummy = false;

    if (!player) {
      try {
        player = await client.manager.createPlayer({
          guildId: message.guildId,
          voiceId: message.member.voice?.channelId || message.guild.channels.cache.filter(c => c.isVoiceBased()).first()?.id,
          textId: message.channel.id,
          deaf: true,
        });
        createdDummy = true;
      } catch (err) {
        return loadMsg.edit(C.v2(C.fail(`Failed to initialize search node: ${err.message}`)));
      }
    }

    /* ── Search (Forced Spotify Engine) ──────────── */
    let result;
    try {
      result = await player.search(query, { requester: message.author, engine: "spsearch" });
    } catch (err) {
      if (createdDummy) player.destroy();
      return loadMsg.edit(C.v2(C.fail(`Spotify Search failed: ${err.message}`)));
    }

    if (!result?.tracks?.length) {
      if (createdDummy) player.destroy();
      return loadMsg.edit(C.v2(C.fail(`No results found on Spotify for \`${query.substring(0, 80)}\`.`)));
    }

    /* ── Playlist Rendering ──────────────────────── */
    if (result.type === "PLAYLIST") {
      const dur = result.tracks.reduce((a, t) => a + (t.length || 0), 0);
      
      const container = C.container(COLORS.spotify)
        .addTextDisplayComponents(C.text(`### 🟢  Spotify Playlist Preview`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**${result.playlistName || "Unknown Playlist"}**\n\n` +
          `${e.dot} **Total Tracks** · \`${result.tracks.length}\`\n` +
          `${e.dot} **Total Duration** · \`${convertTime(dur)}\`\n` +
          `${e.dot} **First Track** · ${result.tracks[0].title} by ${result.tracks[0].author}`
        ))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(
            C.btn.primary(`splay_pl_${message.id}`, "Play Playlist", "▶️"),
            C.btn.secondary(`scancel_${message.id}`, "Dismiss", "✖️")
          )
        )
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Premium Spotify`));

      if (createdDummy) player.destroy();
      return loadMsg.edit(C.v2(container));
    }

    /* ── Single Track Rendering ──────────────────── */
    const track = result.tracks[0];
    const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;
    const title = track.title.length > 50 ? track.title.slice(0, 50) + "…" : track.title;

    const container = C.container(COLORS.spotify)
      .addTextDisplayComponents(C.text(`### 🟢  Spotify Track Preview`))
      .addSeparatorComponents(C.separator());

    const body =
      `**${title}**\nby **${track.author}**\n\n` +
      `${e.dot} **Duration** · \`${track.isStream ? "🔴 LIVE" : convertTime(track.length)}\`\n` +
      `${e.dot} **Source** · Spotify Native Stream\n` +
      `${e.dot} **Identifier** · \`${track.identifier}\``;

    if (thumb) {
      container.addSectionComponents(C.section(body, thumb));
    } else {
      container.addTextDisplayComponents(C.text(body));
    }

    container
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
          C.row(
            C.btn.primary(`splay_tr_${message.id}`, "Play Track", "▶️"),
            C.btn.secondary(`scancel_${message.id}`, "Dismiss", "✖️")
          )
        )
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Premium Spotify`));

    if (createdDummy) player.destroy();
    await loadMsg.edit(C.v2(container));
  },
};
