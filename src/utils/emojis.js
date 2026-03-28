/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Emoji Registry
 *
 *  Strict core palette + brand mark. Clean, professional, no clutter.
 *  Backward-compat aliases at the bottom for unrewritten commands.
 * ══════════════════════════════════════════════════════════════════ */

const core = {
  /* ── Brand ─────────────────────────────────── */
  mark:     "◆",

  /* ── Status ────────────────────────────────── */
  tick:     "✅",
  cross:    "❌",
  warn:     "⚠️",
  dot:      "•",
  loading:  "⏳",

  /* ── Music Controls ────────────────────────── */
  play:     "▶️",
  pause:    "⏸️",
  skip:     "⏭️",
  previous: "⏮️",
  loop:     "🔁",
  shuffle:  "🔀",
  autoplay: "🔄",
  volume:   "🔊",
  music:    "🎵",
  queue:    "📋",

  /* ── Utility ───────────────────────────────── */
  search:   "🔍",
  config:   "⚙️",
  shield:   "🛡️",
  trash:    "🗑️",
  premium:  "💎",
};

/* ── Backward-compat aliases ─────────────────────
 *  TODO: Remove after command/slash refactor batch.
 *  These exist so unrewritten commands don't break.
 * ─────────────────────────────────────────────── */
core.playing     = core.music;
core.stop        = "⏹️";
core.resume      = core.play;
core.filter      = core.config;
core.replay      = core.loop;
core.addsong     = "➕";
core.antinuke    = core.shield;
core.moderation  = core.shield;
core.automod     = core.shield;
core.information = "ℹ️";
core.leave       = core.cross;
core.join        = core.play;
core.remove      = core.trash;
core.delete      = core.trash;

module.exports = core;