/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Player Utilities
 *
 *  Absorbed: functions.js (levenshtein, isTooSimilar)
 *            progressbar.js (progressbar)
 * ══════════════════════════════════════════════════════════════════ */

/* ── Safe Player Destruction ─────────────────────── */

async function safeDestroyPlayer(player) {
  if (!player) return;
  try { await player.destroy(); }
  catch (e) { if (e.status !== 404) console.error(`Error destroying player ${player.guildId}:`, e); }
}

async function handleSessionError(error, player, client) {
  if (error.status === 404 && error.message?.includes("Session not found")) {
    try { client.manager.players.delete(player.guildId); } catch {}
    return true;
  }
  return false;
}

/* ── String Utilities (from functions.js) ────────── */

function levenshtein(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function isTooSimilar(a, b, threshold = 0.3) {
  if (!a || !b) return false;
  const norm = (s) => s.toLowerCase().replace(/[^\w\s]/gi, "").trim();
  const na = norm(a), nb = norm(b);
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return false;
  return 1 - levenshtein(na, nb) / maxLen >= threshold;
}

/* ── Progress Bar (from progressbar.js) ──────────── */

function progressbar(player, opts = {}) {
  const size = opts.size || 15;
  const line = opts.line || "▬";
  const slider = opts.slider || "🔘";
  if (!player.queue.current) return `${slider}${line.repeat(size - 1)}`;
  const current = player.shoukaku?.position || 0;
  const total = player.queue.current.length || 0;
  if (total === 0) return `${slider}${line.repeat(size - 1)}`;
  const progress = Math.min(Math.round(size * (current / total)), size);
  return `${line.repeat(Math.max(0, progress))}${slider}${line.repeat(Math.max(0, size - progress - 1))}`;
}

/* ── Normalization Helpers ───────────────────────── */

function normalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\s*[-–]\s*topic\s*$/gi, "")
    .replace(/\(.*?(official|audio|video|lyrics|hd|4k|remaster|live|remix|ft\.?).*?\)/gi, "")
    .replace(/\[.*?(official|audio|video|lyrics|hd|4k|remaster|live|remix|ft\.?).*?\]/gi, "")
    .replace(/\b(official|audio|video|lyrics|hd|4k|8k|remaster(ed)?|mv|full|song)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractYouTubeId(uri) {
  if (!uri) return null;
  const m = uri.match(/(?:v=|\/vi?\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function trackFingerprint(track) {
  if (!track) return null;
  if (track.identifier) return `id:${track.identifier}`;
  const ytId = extractYouTubeId(track.uri);
  if (ytId) return `yt:${ytId}`;
  return `ta:${normalize(track.title)}::${normalize(track.author)}`;
}

function isSameTrack(a, b) {
  if (!a || !b) return false;
  if (a.identifier && b.identifier && a.identifier === b.identifier) return true;
  const aYt = extractYouTubeId(a.uri), bYt = extractYouTubeId(b.uri);
  if (aYt && bYt && aYt === bYt) return true;
  const aTitle = normalize(a.title), bTitle = normalize(b.title);
  const aAuth = normalize(a.author), bAuth = normalize(b.author);
  if (aTitle && bTitle && aTitle === bTitle) {
    if (aAuth && bAuth && (aAuth === bAuth || aAuth.includes(bAuth) || bAuth.includes(aAuth))) {
      const aDur = Number(a.length || 0), bDur = Number(b.length || 0);
      if (aDur === 0 || bDur === 0 || Math.abs(aDur - bDur) <= 3000) return true;
    }
  }
  return false;
}

function cleanAuthor(author) {
  if (!author) return "";
  return author.replace(/\s*-\s*Topic\s*$/i, "").trim();
}

/* ── VC Listener Check ───────────────────────────── */

function hasListeners(client, player) {
  try {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return false;
    const vc = guild.channels.cache.get(player.voiceId);
    if (!vc) return false;
    return vc.members.filter((m) => !m.user.bot).size > 0;
  } catch { return false; }
}

/* ── Autoplay History ────────────────────────────── */

const MAX_HISTORY = 20;

function getHistory(player) {
  let h = player.data?.get("autoplayHistory");
  if (!Array.isArray(h)) { h = []; player.data?.set("autoplayHistory", h); }
  return h;
}

function addToHistory(player, track) {
  const history = getHistory(player);
  const fp = trackFingerprint(track);
  if (!fp) return;
  const idx = history.indexOf(fp);
  if (idx !== -1) history.splice(idx, 1);
  history.unshift(fp);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  player.data?.set("autoplayHistory", history);
}

function isInHistory(player, track) {
  const fp = trackFingerprint(track);
  return fp ? getHistory(player).includes(fp) : false;
}

function clearHistory(player) {
  player.data?.set("autoplayHistory", []);
}

/* ── Autoplay ────────────────────────────────────── */

async function attemptAutoplay(client, player) {
  if (!player || !client) return false;
  if (!player.data?.get("autoplay")) return false;

  const loop = (player.loop || "none").toString().toLowerCase();
  if (loop === "track" || loop === "queue") return false;
  if (player.queue?.size > 0 || player.playing || player.paused) return false;
  if (player.data?.get("autoplayLock")) return false;

  player.data?.set("autoplayLock", true);
  const lockTimeout = setTimeout(() => player.data?.delete("autoplayLock"), 15_000);

  try {
    if (!hasListeners(client, player)) return false;

    const lastTrack = player.data?.get("lastTrack");
    if (!lastTrack?.title) return false;

    const queries = buildSearchQueries(lastTrack);
    if (!queries.length) return false;

    let foundTrack = null;
    let attempts = 0;

    for (const { query, engine } of queries) {
      if (foundTrack || attempts >= 4) break;
      attempts++;
      try {
        const searchFn = player.search?.bind(player) || client.manager?.search?.bind(client.manager);
        if (!searchFn) continue;
        const res = await searchFn(query, { requester: lastTrack.requester || client.user, engine });
        const tracks = res?.tracks;
        if (!tracks?.length) continue;
        foundTrack = tracks.find((t) => !isSameTrack(lastTrack, t) && !isInHistory(player, t));
        if (!foundTrack) foundTrack = tracks.find((t) => !isSameTrack(lastTrack, t));
        if (foundTrack && isSameTrack(lastTrack, foundTrack)) foundTrack = null;
      } catch { continue; }
    }

    if (!foundTrack) {
      clearHistory(player);
      try {
        const artist = cleanAuthor(lastTrack.author);
        if (artist) {
          const searchFn = player.search?.bind(player) || client.manager?.search?.bind(client.manager);
          if (searchFn) {
            const res = await searchFn(`${artist} popular songs`, { requester: lastTrack.requester || client.user, engine: "ytsearch" });
            foundTrack = res?.tracks?.find((t) => !isSameTrack(lastTrack, t));
          }
        }
      } catch {}
      if (!foundTrack) return false;
    }

    if (!hasListeners(client, player)) return false;
    if (player.queue?.size > 0 || player.playing || player.paused) return false;

    addToHistory(player, foundTrack);
    player.data.set("lastTrack", foundTrack);
    player.queue.add(foundTrack);

    if (!player.playing && !player.paused) {
      try { await player.play(); }
      catch { return false; }
    }
    return true;
  } catch { return false; }
  finally {
    clearTimeout(lockTimeout);
    player.data?.delete("autoplayLock");
  }
}

function buildSearchQueries(track) {
  const queries = [];
  const title = track.title?.trim();
  const author = cleanAuthor(track.author);
  if (!title) return queries;

  if (track.identifier && (track.sourceName === "youtube" || !track.sourceName)) {
    queries.push({ query: `https://www.youtube.com/watch?v=${track.identifier}&list=RD${track.identifier}`, engine: "ytsearch" });
  }
  if (author) queries.push({ query: `${author} mix`, engine: "ytmsearch" });
  queries.push({ query: `${title} ${author}`, engine: "ytmsearch" });
  if (author) queries.push({ query: `${author} songs`, engine: "ytsearch" });
  queries.push({ query: `${title} ${author}`, engine: "spsearch" });
  queries.push({ query: title, engine: "ytsearch" });

  return queries;
}

/* ── Exports ─────────────────────────────────────── */

module.exports = {
  safeDestroyPlayer,
  handleSessionError,
  attemptAutoplay,
  isSameTrack,
  hasListeners,
  addToHistory,
  clearHistory,
  trackFingerprint,
  normalize,
  progressbar,
  levenshtein,
  isTooSimilar,
};