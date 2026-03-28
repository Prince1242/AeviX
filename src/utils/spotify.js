/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Spotify Web API Utility
 *
 *  Uses Client Credentials flow (no user OAuth needed).
 *  Accesses public profiles, playlists, artists, tracks, recommendations.
 *  Token is cached and auto-refreshed.
 * ══════════════════════════════════════════════════════════════════════ */

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

/* ── Token Cache ─────────────────────────────── */
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Gets a valid Spotify access token (client credentials flow).
 * Caches and auto-refreshes.
 * @param {Object} config - Bot config with SpotifyID and SpotifySecret
 * @returns {Promise<string>}
 */
async function getToken(config) {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const credentials = Buffer.from(
    `${config.SpotifyID}:${config.SpotifySecret}`
  ).toString("base64");

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

/**
 * Makes an authenticated request to the Spotify API.
 * @param {Object} config
 * @param {string} endpoint - e.g. "/users/spotify"
 * @param {Object} [params] - Query parameters
 * @returns {Promise<Object|null>}
 */
async function spotifyRequest(config, endpoint, params = {}) {
  const token = await getToken(config);

  const url = new URL(`${SPOTIFY_API}${endpoint}`);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) url.searchParams.set(key, val);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spotify API ${res.status}: ${text.substring(0, 200)}`);
  }

  return res.json();
}

/* ── Public Helpers ──────────────────────────── */

/**
 * Extracts a Spotify user ID from various input formats.
 * Supports: username, profile URL, Spotify URI
 * @param {string} input
 * @returns {string}
 */
function parseSpotifyId(input) {
  if (!input) return "";
  input = input.trim();

  // URL: https://open.spotify.com/user/USERNAME?...
  const urlMatch = input.match(
    /open\.spotify\.com\/user\/([a-zA-Z0-9._-]+)/i
  );
  if (urlMatch) return urlMatch[1];

  // URI: spotify:user:USERNAME
  const uriMatch = input.match(/spotify:user:([a-zA-Z0-9._-]+)/i);
  if (uriMatch) return uriMatch[1];

  // Direct username (strip leading @)
  return input.replace(/^@/, "").split(/[\s?#/]/)[0];
}

/**
 * Extracts a Spotify playlist ID from a URL.
 * @param {string} input
 * @returns {string|null}
 */
function parsePlaylistId(input) {
  if (!input) return null;
  const m = input.match(
    /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/i
  );
  return m ? m[1] : null;
}

/**
 * Fetches a Spotify user's public profile.
 * @param {Object} config
 * @param {string} spotifyId
 * @returns {Promise<Object|null>}
 */
async function fetchProfile(config, spotifyId) {
  return spotifyRequest(config, `/users/${encodeURIComponent(spotifyId)}`);
}

/**
 * Fetches a user's public playlists.
 * @param {Object} config
 * @param {string} spotifyId
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
async function fetchUserPlaylists(config, spotifyId, limit = 50) {
  const data = await spotifyRequest(
    config,
    `/users/${encodeURIComponent(spotifyId)}/playlists`,
    { limit, offset: 0 }
  );
  return data?.items || [];
}

/**
 * Fetches playlist details including tracks.
 * @param {Object} config
 * @param {string} playlistId
 * @returns {Promise<Object|null>}
 */
async function fetchPlaylist(config, playlistId) {
  return spotifyRequest(config, `/playlists/${playlistId}`, {
    fields:
      "id,name,description,images,owner(display_name),tracks(total,items(track(name,artists,duration_ms,external_urls)))",
  });
}

/**
 * Searches Spotify for tracks, artists, albums, or playlists.
 * @param {Object} config
 * @param {string} query
 * @param {string} [type="track"]
 * @param {number} [limit=10]
 * @returns {Promise<Object>}
 */
async function searchSpotify(config, query, type = "track", limit = 10) {
  return spotifyRequest(config, "/search", { q: query, type, limit });
}

/**
 * Fetches an artist by ID or searches by name.
 * @param {Object} config
 * @param {string} query - Artist name or Spotify artist ID/URL
 * @returns {Promise<Object|null>}
 */
async function fetchArtist(config, query) {
  // Check if it's a Spotify URL/ID
  const urlMatch = query.match(
    /open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i
  );
  const directId = urlMatch
    ? urlMatch[1]
    : /^[a-zA-Z0-9]{22}$/.test(query)
      ? query
      : null;

  if (directId) {
    return spotifyRequest(config, `/artists/${directId}`);
  }

  // Search by name
  const results = await searchSpotify(config, query, "artist", 1);
  return results?.artists?.items?.[0] || null;
}

/**
 * Fetches an artist's top tracks.
 * @param {Object} config
 * @param {string} artistId
 * @param {string} [market="US"]
 * @returns {Promise<Array>}
 */
async function fetchArtistTopTracks(config, artistId, market = "US") {
  const data = await spotifyRequest(
    config,
    `/artists/${artistId}/top-tracks`,
    { market }
  );
  return data?.tracks || [];
}

/**
 * Gets track recommendations based on seed tracks/artists.
 * @param {Object} config
 * @param {Object} seeds - { seed_tracks, seed_artists, seed_genres }
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
async function getRecommendations(config, seeds = {}, limit = 10) {
  const data = await spotifyRequest(config, "/recommendations", {
    ...seeds,
    limit,
  });
  return data?.tracks || [];
}

/**
 * Searches for a track on Spotify and returns its ID.
 * @param {Object} config
 * @param {string} title
 * @param {string} [artist]
 * @returns {Promise<Object|null>}
 */
async function findTrack(config, title, artist) {
  const q = artist ? `track:${title} artist:${artist}` : title;
  const results = await searchSpotify(config, q, "track", 1);
  return results?.tracks?.items?.[0] || null;
}

/**
 * Formats milliseconds to mm:ss
 * @param {number} ms
 * @returns {string}
 */
function formatMs(ms) {
  if (!ms) return "0:00";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Formats a large number with commas.
 * @param {number} n
 * @returns {string}
 */
function formatCount(n) {
  if (!n) return "0";
  return Number(n).toLocaleString("en-US");
}

module.exports = {
  getToken,
  spotifyRequest,
  parseSpotifyId,
  parsePlaylistId,
  fetchProfile,
  fetchUserPlaylists,
  fetchPlaylist,
  searchSpotify,
  fetchArtist,
  fetchArtistTopTracks,
  getRecommendations,
  findTrack,
  formatMs,
  formatCount,
};