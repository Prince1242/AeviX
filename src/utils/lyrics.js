/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Lyrics Utility (LRCLIB)
 *
 *  Free synced + plain lyrics via lrclib.net.
 *  Includes position interpolation for accurate live sync.
 * ══════════════════════════════════════════════════════════════════ */

const LRCLIB = "https://lrclib.net/api";
const UA = "Aevix Discord Bot/1.0";

/* ── Title / Artist cleaning ─────────────────────── */

function cleanTitle(title) {
  if (!title) return "";
  return title
    .replace(/\(.*?(official|audio|video|lyrics|hd|4k|remaster|live|remix|ft\.?|feat\.?).*?\)/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\b(official|audio|video|lyrics|hd|4k|8k|remaster(ed)?|mv|full\s*song)\b/gi, "")
    .replace(/\|.*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanArtist(artist) {
  if (!artist) return "";
  return artist
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s*,\s*/g, " ")
    .trim();
}

/* ── Fetch strategies ────────────────────────────── */

async function directLookup(trackName, artistName, duration) {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });
    if (duration) params.set("duration", duration);

    const res = await fetch(`${LRCLIB}/get?${params}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.syncedLyrics || data.plainLyrics ? data : null;
  } catch {
    return null;
  }
}

async function searchLyrics(query) {
  try {
    const res = await fetch(
      `${LRCLIB}/search?q=${encodeURIComponent(query)}`,
      {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || !arr.length) return null;
    return arr.find((x) => x.syncedLyrics) || arr[0];
  } catch {
    return null;
  }
}

/**
 * Multi-strategy lyrics fetch.
 */
async function fetchLyrics(title, artist, durationMs) {
  const t = cleanTitle(title);
  const a = cleanArtist(artist);
  if (!t) return null;

  /* Strategy 1: Exact match with duration */
  if (t && a && durationMs) {
    const r = await directLookup(t, a, Math.round(durationMs / 1000));
    if (r) return r;
  }

  /* Strategy 2: Exact match without duration */
  if (t && a) {
    const r = await directLookup(t, a);
    if (r) return r;
  }

  /* Strategy 3: Search queries */
  for (const q of [`${t} ${a}`, t]) {
    const r = await searchLyrics(q);
    if (r) return r;
  }

  return null;
}

/* ── LRC Parser ──────────────────────────────────── */

/**
 * Parses LRC synced lyrics into structured array.
 * @param {string} lrc
 * @returns {{ time: number, text: string }[]}
 */
function parseSynced(lrc) {
  if (!lrc) return [];

  return lrc
    .split("\n")
    .map((line) => {
      const m = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/);
      if (!m) return null;

      const ms =
        parseInt(m[1]) * 60000 +
        parseInt(m[2]) * 1000 +
        parseInt(m[3].padEnd(3, "0"));

      return { time: ms, text: m[4].trim() };
    })
    .filter((l) => l !== null && l.text.length > 0);
}

/* ── Position Tracking ───────────────────────────── */

/**
 * Creates a position tracker that interpolates between
 * Lavalink's periodic position updates for smooth sync.
 *
 * Lavalink sends position every ~1s. Between updates,
 * the raw position is STALE. This tracker detects when
 * a new update arrives and interpolates in between.
 *
 * @param {Function} getPlayer - Returns the current player or null
 * @returns {{ getPosition: () => number, destroy: () => void }}
 */
function createPositionTracker(getPlayer) {
  let lastRawPos = 0;
  let lastRawTime = Date.now();
  let destroyed = false;

  return {
    /**
     * Returns interpolated position in ms.
     * Accurate to within ~50ms vs actual playback.
     */
    getPosition() {
      if (destroyed) return 0;

      const player = getPlayer();
      if (!player) return 0;

      const rawPos = player.shoukaku?.position ?? 0;

      /* Detect new Lavalink position update */
      if (rawPos !== lastRawPos) {
        lastRawPos = rawPos;
        lastRawTime = Date.now();
      }

      /* If paused, return raw position */
      if (player.paused) return rawPos;

      /* Interpolate: rawPos + time since last update */
      const elapsed = Date.now() - lastRawTime;

      /* Cap interpolation at 2s to avoid runaway on stale data */
      const interpolated = rawPos + Math.min(elapsed, 2000);

      return interpolated;
    },

    destroy() {
      destroyed = true;
    },
  };
}

/* ── Line Finding ────────────────────────────────── */

/**
 * Binary search for the current lyric line.
 * @param {{ time: number }[]} lines
 * @param {number} posMs - Adjusted playback position
 * @returns {number}
 */
function findCurrentLine(lines, posMs) {
  if (!lines.length) return 0;

  let lo = 0;
  let hi = lines.length - 1;

  /* All lines are in the future */
  if (posMs < lines[0].time) return 0;

  /* Last line already passed */
  if (posMs >= lines[hi].time) return hi;

  /* Binary search */
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;

    if (lines[mid].time <= posMs) {
      if (mid + 1 >= lines.length || lines[mid + 1].time > posMs) {
        return mid;
      }
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return lo;
}

/* ── Formatting ──────────────────────────────────── */

function formatTimestamp(ms) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

module.exports = {
  fetchLyrics,
  parseSynced,
  findCurrentLine,
  formatTimestamp,
  createPositionTracker,
};