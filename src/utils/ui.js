/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Design System (Compatibility Shim)
 *
 *  All brand tokens now live in src/custom/components.js.
 *  This file re-exports them for backward compatibility with
 *  commands and slash commands that import from utils/ui.
 *
 *  For new code, import directly from components:
 *    const C = client.components;
 *    const { MARK, FOOTER, COLORS } = require("../../custom/components");
 * ══════════════════════════════════════════════════════════════════ */

const Components = require("../custom/components");

module.exports = {
  /** Brand accent colors (aliased from Components.COLORS) */
  COLOR: {
    brand:   Components.COLORS.brand,
    success: Components.COLORS.success,
    error:   Components.COLORS.error,
    warn:    Components.COLORS.warn,
    spotify: Components.COLORS.spotify,
    muted:   Components.COLORS.muted,
  },

  /** Brand mark */
  M: Components.MARK,

  /** Standard footer line */
  F: Components.FOOTER,

  /**
   * Quick response builders — return full v2 payload.
   * C is the Components class (client.components).
   */
  ok:   (C, text) => C.v2(C.ok(text)),
  err:  (C, text) => C.v2(C.fail(text)),
  warn: (C, text) => C.v2(C.caution(text)),
  info: (C, text) => C.v2(C.info(text)),

  /**
   * Branded card — title, body, optional thumbnail & buttons.
   * Returns full v2 payload.
   *
   * @param {Components} C
   * @param {string} title
   * @param {string} body
   * @param {Object} [opts] — { color, thumb, footer, row }
   */
  card(C, title, body, opts = {}) {
    const mapped = {};
    if (opts.color !== undefined) mapped.color = opts.color;
    if (opts.thumb) mapped.thumbnail = opts.thumb;
    if (opts.footer !== undefined) mapped.footer = opts.footer;
    if (opts.row) mapped.actions = opts.row;
    return C.v2(Components.infoCard(title, body, mapped));
  },
};