/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Player End (Track Finished)
 *
 *  In SETUP MODE: No message deletion needed (panel is updated
 *  in-place by playerStart). No collector to stop.
 *
 *  In NORMAL MODE: Stops the NP collector and deletes the
 *  now-playing message.
 * ══════════════════════════════════════════════════════════════════ */

module.exports = {
  name: "playerEnd",
  run: async (client, player) => {
    /* ── Setup mode — skip cleanup ───────────────── */
    if (player.data?.get("isSetup")) {
      /* No NP message or collector exists in setup mode.
       * Panel is updated in-place by playerStart.
       * DO NOT call autoplay here — playerEmpty handles it. */
      return;
    }

    /* ── Normal mode — cleanup ───────────────────── */

    /* Stop collector to prevent ghost listeners */
    const collector = player.data.get("collector");
    if (collector && !collector.ended) collector.stop("trackEnd");
    player.data.delete("collector");

    /* Delete now-playing message */
    try {
      const msg = player.data.get("message") || player.data.get("nowPlayingMessage");
      if (msg?.deletable) await msg.delete().catch(() => null);
    } catch {}
    player.data.delete("message");
    player.data.delete("nowPlayingMessage");

    /* DO NOT call autoplay here — playerEmpty handles it */
  },
};