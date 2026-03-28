/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Response Utilities
 *
 *  sendTemp/replyTemp for auto-deleting messages.
 *  Factory functions delegate to Components cards.
 *
 *  All brand tokens (colors, footer, mark) come from
 *  src/custom/components.js — single source of truth.
 * ══════════════════════════════════════════════════════════════════ */

const Components = require("../custom/components");

const { FOOTER, COLORS } = Components;
const AUTO_DELETE_MS = 8_000;
const ERROR_DELETE_MS = 12_000;
const WARN_DELETE_MS = 10_000;

/* ── Temp-send helpers ───────────────────────────── */

async function sendTemp(channel, container, client, deleteAfter = AUTO_DELETE_MS) {
  try {
    const msg = await channel.send(client.components.v2(container));
    if (deleteAfter > 0) setTimeout(() => msg.delete().catch(() => null), deleteAfter);
    return msg;
  } catch { return null; }
}

async function replyTemp(message, container, client, deleteAfter = AUTO_DELETE_MS, deleteTrigger = false) {
  try {
    const msg = await message.reply(client.components.v2(container));
    if (deleteAfter > 0) {
      setTimeout(() => {
        msg.delete().catch(() => null);
        if (deleteTrigger && message.deletable) message.delete().catch(() => null);
      }, deleteAfter);
    }
    return msg;
  } catch { return null; }
}

/* ── Factory functions (thin wrappers) ───────────── */

function errorResponse(client, text, opts = {}) {
  return client.components.errorCard(text, { footer: opts.footer || FOOTER });
}

function successResponse(client, text, opts = {}) {
  return client.components.successCard(text, { footer: opts.footer || FOOTER });
}

function warnResponse(client, text, opts = {}) {
  return client.components.warnCard(text, { footer: opts.footer || FOOTER });
}

function infoResponse(client, title, text, opts = {}) {
  return client.components.infoCard(title, text, {
    footer: opts.footer || FOOTER,
    thumbnail: opts.thumbnail,
    color: opts.color,
    actions: opts.buttons ? client.components.row(...opts.buttons) : undefined,
  });
}

function musicResponse(client, title, text, opts = {}) {
  return infoResponse(client, title, text, {
    color: opts.color || COLORS.brand,
    ...opts,
  });
}

module.exports = {
  sendTemp,
  replyTemp,
  errorResponse,
  successResponse,
  warnResponse,
  infoResponse,
  musicResponse,
  FOOTER,
  AUTO_DELETE_MS,
  ERROR_DELETE_MS,
  WARN_DELETE_MS,
};