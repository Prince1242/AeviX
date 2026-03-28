/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Setup Channel Song Request Handler
 *
 *  When a user types in the setup text channel, treat it as a
 *  song search query. Delete the message, search, add to queue,
 *  and send a brief auto-deleting confirmation.
 * ══════════════════════════════════════════════════════════════════ */

const Setup = require("../../schema/setup");
const { convertTime } = require("../../utils/convert");
const { sendTemp } = require("../../utils/response");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;

    /* ── Check if this is a setup channel ────────── */
    const data = await Setup.findOne({
      Guild: message.guild.id,
      Channel: message.channel.id,
    });
    if (!data) return;

    const C = client.components;
    const e = client.emoji;

    /* ── Delete user's message immediately ────────── */
    await message.delete().catch(() => null);

    const query = message.content.trim();
    if (!query || query.length < 2) return;

    /* ── Ignore command-like messages ─────────────── */
    if (query.startsWith("/") || query.startsWith(client.prefix)) return;

    /* ── Check voice channel ─────────────────────── */
    const setupVoiceId = data.voiceChannel;
    const userVoiceId = message.member.voice?.channelId;

    if (!userVoiceId) {
      return sendTemp(
        message.channel,
        C.fail(`Join ${setupVoiceId ? `<#${setupVoiceId}>` : "a voice channel"} to request songs.`),
        client, 5_000
      );
    }

    /* If a setup voice channel exists, user must be in it */
    if (setupVoiceId) {
      const setupVc = message.guild.channels.cache.get(setupVoiceId);
      if (setupVc && userVoiceId !== setupVoiceId) {
        return sendTemp(
          message.channel,
          C.fail(`Join <#${setupVoiceId}> to request songs.`),
          client, 5_000
        );
      }
    }

    /* ── Create or get player ────────────────────── */
    let player;
    try {
      player = await client.manager.createPlayer({
        guildId: message.guild.id,
        voiceId: setupVoiceId || userVoiceId,
        textId: message.channel.id,
        deaf: true,
        volume: 80,
      });
    } catch (err) {
      return sendTemp(
        message.channel,
        C.fail(`Connection failed: ${err.message}`),
        client, 8_000
      );
    }

    /* ── Search ──────────────────────────────────── */
    let result;
    try {
      result = await player.search(query, { requester: message.author });
    } catch (err) {
      return sendTemp(
        message.channel,
        C.fail(`Search failed — try again.`),
        client, 5_000
      );
    }

    if (!result?.tracks?.length) {
      return sendTemp(
        message.channel,
        C.fail(`No results for \`${query.substring(0, 60)}\`.`),
        client, 5_000
      );
    }

    /* ── Add tracks ──────────────────────────────── */
    const isPlaylist = result.type === "PLAYLIST";

    if (isPlaylist) {
      for (const track of result.tracks) player.queue.add(track);
    } else {
      player.queue.add(result.tracks[0]);
    }

    if (!player.playing && !player.paused) {
      try {
        await player.play();
      } catch {
        return sendTemp(message.channel, C.fail("Playback failed."), client, 5_000);
      }
    }

    /* ── Confirmation (auto-delete) ──────────────── */
    if (isPlaylist) {
      const dur = result.tracks.reduce((a, t) => a + (t.length || 0), 0);
      sendTemp(
        message.channel,
        C.ok(
          `**${result.playlistName || "Playlist"}** — \`${result.tracks.length}\` tracks (\`${convertTime(dur)}\`)\n` +
          `-# Requested by ${message.author}`
        ),
        client, 8_000
      );
    } else {
      const track = result.tracks[0];
      const position = player.queue.size;
      const title = track.title.length > 45 ? track.title.slice(0, 45) + "…" : track.title;

      if (position === 0) {
        /* Playing immediately — minimal */
        sendTemp(
          message.channel,
          C.ok(`Now playing **${title}**\n-# ${message.author}`),
          client, 8_000
        );
      } else {
        sendTemp(
          message.channel,
          C.ok(
            `**${title}** — \`${convertTime(track.length)}\` — Position #${position}\n` +
            `-# Requested by ${message.author}`
          ),
          client, 8_000
        );
      }
    }
  },
};