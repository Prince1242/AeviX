/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Player Empty (Queue Finished)
 *
 *  Two modes:
 *  1. SETUP CHANNEL — Restores the panel to idle state. No separate
 *     message sent.
 *  2. NORMAL CHANNEL — Sends queue-finished notification with
 *     autoplay/24/7 status and disconnect timer.
 * ══════════════════════════════════════════════════════════════════ */

const Setup = require("../../schema/setup");
const db2 = require("../../schema/247");
const { attemptAutoplay, hasListeners } = require("../../utils/playerUtils");
const { sendTemp } = require("../../utils/response");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

/* ── Restore setup panel to idle state ───────────── */
async function restoreSetupPanel(client, player, setupData) {
  const C = client.components;
  const e = client.emoji;
  const channel = client.channels.cache.get(setupData.Channel);
  if (!channel) return;

  const voiceCh = client.channels.cache.get(setupData.voiceChannel || player.voiceId);
  const voiceName = voiceCh?.name || "Voice";
  const is247 = await db2.findOne({ Guild: player.guildId });

  const container = C.container(COLORS.brand)
    .addTextDisplayComponents(C.text(`### ${MARK}  Aevix Music`))
    .addSeparatorComponents(C.separator())
    .addSectionComponents(
      C.section(
        `Queue is empty — type a song name or URL below.\n\n` +
        `**Supported Sources**\n` +
        `${e.dot} YouTube · YouTube Music · Spotify\n` +
        `${e.dot} SoundCloud · Apple Music · Deezer\n\n` +
        `${e.dot} **24/7** · ${is247 ? "Enabled" : "Disabled"}\n` +
        `${e.dot} **Status** · Idle`,
        client.user.displayAvatarURL({ size: 256 })
      )
    )
    .addSeparatorComponents(C.separator())
    .addActionRowComponents(
      C.row(
        C.btn.secondary("setup_pause", null, "⏸️"),
        C.btn.secondary("setup_skip", null, "⏭️"),
        C.btn.danger("setup_stop", null, "⏹️"),
        C.btn.secondary("setup_loop", null, "🔁"),
        C.btn.secondary("setup_shuffle", null, "🔀"),
      )
    )
    .addSeparatorComponents(C.separator())
    .addTextDisplayComponents(
      C.text(`-# ${MARK} 🔊 ${voiceName} · Type a song name to play`)
    );

  try {
    const msg = await channel.messages.fetch(setupData.Message).catch(() => null);
    if (msg) await msg.edit(C.v2(container));
  } catch {}
}

module.exports = {
  name: "playerEmpty",
  run: async (client, player) => {
    /* Clean up NP message (only exists in normal mode) */
    if (!player.data?.get("isSetup")) {
      try {
        const msg = player.data.get("message") || player.data.get("nowPlayingMessage");
        if (msg?.deletable) await msg.delete().catch(() => null);
      } catch {}
      player.data.delete("message");
      player.data.delete("nowPlayingMessage");
    }

    /* ── Autoplay attempt ────────────────────────── */
    if (player.data?.get("autoplay")) {
      if (hasListeners(client, player)) {
        try {
          const success = await attemptAutoplay(client, player);
          if (success && (player.queue.size > 0 || player.playing)) return;
        } catch (e) {
          client.logger.log(`[Autoplay] playerEmpty error: ${e.message}`, "error");
        }
        if (player.data.get("autoplay")) {
          player.data.set("autoplay", false);
        }
      } else {
        player.data.set("autoplay", false);
      }
    }

    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    const is247 = await db2.findOne({ Guild: player.guildId });

    /* Reset VC status */
    client.rest.put(`/channels/${player.voiceId}/voice-status`, {
      body: { status: `${client.prefix}play` },
    }).catch(() => null);

    /* ── Check for Setup Channel ─────────────────── */
    const setupData = await Setup.findOne({ Guild: player.guildId });
    const isSetupChannel = setupData && player.textId === setupData.Channel;

    if (isSetupChannel) {
      /* SETUP MODE — restore panel to idle, no separate message */
      await restoreSetupPanel(client, player, setupData);

      /* Still schedule disconnect if no 24/7 */
      if (!is247) {
        const idleSince = Date.now();
        player.data.set("idleSince", idleSince);
        setTimeout(async () => {
          const active = client.manager.players.get(player.guildId);
          if (!active || active.data.get("idleSince") !== idleSince) return;
          if (!active.queue?.current && !active.playing) {
            /* Don't destroy in setup mode — just stay idle */
          }
        }, 120_000);
      }
      return;
    }

    /* ── NORMAL MODE — send queue finished message ── */
    const C = client.components;
    const e = client.emoji;
    const textChannel = client.channels.cache.get(player.textId);
    if (!textChannel) return;

    /* Schedule disconnect */
    if (!is247) {
      const idleSince = Date.now();
      player.data.set("idleSince", idleSince);
      setTimeout(async () => {
        const active = client.manager.players.get(player.guildId);
        if (!active || active.data.get("idleSince") !== idleSince) return;
        if (!active.queue?.current && !active.playing) await active.destroy().catch(() => null);
      }, 120_000);
    }

    const autoplay = player.data?.get("autoplay");
    const disconnectTs = Math.round((Date.now() + 120_000) / 1000);

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Queue Finished`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **24/7** ${is247 ? e.tick : e.cross}  ${e.dot} **Autoplay** ${autoplay ? e.tick : e.cross}\n` +
        `-# \`${client.prefix}play\` to add more` +
        (!is247 ? ` · disconnecting <t:${disconnectTs}:R>` : "")
      ));

    const msg = await textChannel.send(C.v2(container)).catch(() => null);
    if (msg) setTimeout(() => msg.delete().catch(() => null), 30_000);
  },
};