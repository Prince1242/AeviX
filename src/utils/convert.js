/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Conversion & Formatting Utilities
 *
 *  Absorbed: numformat.js
 * ══════════════════════════════════════════════════════════════════ */

/**
 * Milliseconds → mm:ss or hh:mm:ss
 */
function convertTime(duration) {
  if (!duration || duration < 0) return "00:00";
  const s = Math.floor((duration / 1000) % 60);
  const m = Math.floor((duration / 60000) % 60);
  const h = Math.floor((duration / 3600000) % 24);
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Milliseconds → human-readable "2h 15m 30s"
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return "0s";
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / 60000) % 60);
  const h = Math.floor((ms / 3600000) % 24);
  const d = Math.floor(ms / 86400000);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || !parts.length) parts.push(`${s}s`);
  return parts.join(" ");
}

/**
 * Abbreviate number: 1500 → "1.5K" (full precision)
 */
function convertNumber(number, decPlaces = 1) {
  if (typeof number !== "number" || isNaN(number)) return "0";
  const factor = Math.pow(10, decPlaces);
  const abbrev = ["K", "M", "B", "T"];
  for (let i = abbrev.length - 1; i >= 0; i--) {
    const size = Math.pow(10, (i + 1) * 3);
    if (size <= number) {
      number = Math.round((number * factor) / size) / factor;
      if (number === 1000 && i < abbrev.length - 1) { number = 1; i++; }
      return number + abbrev[i];
    }
  }
  return number;
}

/**
 * Short number abbreviation for display: 1500 → "1.5K"
 * (replaces numformat.js — attached as client.numb)
 */
function numb(number) {
  if (typeof number !== "number" || isNaN(number)) return "0";
  if (number >= 1e9) return (number / 1e9).toFixed(1) + "B";
  if (number >= 1e6) return (number / 1e6).toFixed(1) + "M";
  if (number >= 1e3) return (number / 1e3).toFixed(1) + "K";
  return number.toString();
}

/**
 * Split array into chunks
 */
function chunk(arr, size) {
  if (!Array.isArray(arr) || size < 1) return [arr];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/**
 * Parse "hh:mm:ss" or "mm:ss" → milliseconds
 */
function convertHmsToMs(hms) {
  if (!hms || typeof hms !== "string") return 0;
  const parts = hms.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 1) return parts[0] * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
}

module.exports = {
  convertTime,
  formatDuration,
  convertNumber,
  numb,
  chunk,
  convertHmsToMs,
};