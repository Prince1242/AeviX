/** @format */

const { Kazagumo, KazagumoTrack } = require("kazagumo");
const { Connectors, LoadType } = require("shoukaku");

const searchEngines = {
  DEEZER: "dzsearch",
  SPOTIFY: "spsearch",
  YOUTUBE: "ytsearch",
  JIO_SAAVN: "jssearch",
  APPLE_MUSIC: "amsearch",
  YOUTUBE_MUSIC: "ytmsearch",
  SOUNDCLOUD: "scsearch",
};

const fallbackEngines = ["ytmsearch", "amsearch", "spsearch", "ytsearch"];

function processSearchResult(res, requester) {
  switch (res.loadType) {
    case LoadType.TRACK:
      return {
        type: "TRACK",
        tracks: [new KazagumoTrack(res.data, requester)],
      };
    case LoadType.PLAYLIST:
      return {
        type: "PLAYLIST",
        playlistName: res.data.info?.name || "Unknown Playlist",
        tracks: res.data.tracks.map((t) => new KazagumoTrack(t, requester)),
      };
    case LoadType.SEARCH:
      return {
        type: "SEARCH",
        tracks: res.data.map((t) => new KazagumoTrack(t, requester)),
      };
    default:
      return { type: "SEARCH", tracks: [] };
  }
}

module.exports = function loadPlayerManager(client) {
  /* ══════════════════════════════════════════════════════════════════
   * CRITICAL: Do NOT pass a 4th argument (Shoukaku options).
   *
   * The working reference passes undefined (client.config.node_options
   * which doesn't exist). Shoukaku v4 defaults handle voice connection
   * lifecycle correctly. Explicitly setting resume:true corrupts the
   * session initialization — Lavalink never receives voice server data
   * from Discord, causing the bot to sit in VC with zero audio output.
   *
   * Let Shoukaku use its battle-tested defaults:
   *   reconnectTries: 3, restTimeout: 60000,
   *   voiceConnectionTimeout: 15000, moveOnDisconnect: false
   * ══════════════════════════════════════════════════════════════════ */
  const manager = new Kazagumo(
    {
      defaultSearchEngine: client.config.node_source || "ytsearch",
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
    },
    new Connectors.DiscordJS(client),
    client.config.nodes
  );

  /* Debug: confirm node session is established */
  manager.shoukaku.on("ready", (name, resumed) => {
    const node = manager.shoukaku.nodes.get(name);
    client.logger.log(
      `[LAVALINK] Node "${name}" ready | Resumed: ${resumed} | Session: ${node?.sessionId || "none"}`,
      "ready"
    );
  });

  /* ── Expose search engine metadata ─────────────── */
  manager.searchEngines = searchEngines;
  manager.defaultSearchEngine = client.config.node_source || "ytsearch";

  /* ── Custom search with multi-engine fallback ──── */
  manager.search = async function (query, options = {}) {
    const node = [...this.shoukaku.nodes.values()][0];
    if (!node) return { type: "SEARCH", tracks: [] };

    const isUrl = /^https?:\/\//.test(query);

    /* Try direct URL resolution first */
    if (isUrl) {
      const directRes = await node.rest.resolve(query).catch(() => null);
      if (directRes && directRes.loadType !== LoadType.ERROR) {
        return processSearchResult(directRes, options.requester);
      }

      /* Extract YouTube video ID for fallback search */
      if (query.includes("youtube.com") || query.includes("youtu.be")) {
        const videoId = query.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
        if (videoId) {
          query = `intitle:${videoId}`;
        }
      }
    }

    /* Build engine list: requested engine first, then fallbacks */
    let engineList = [options.engine || this.defaultSearchEngine];
    engineList = [...new Set([...engineList, ...fallbackEngines])];

    for (const engine of engineList) {
      const searchQuery = `${engine}:${query}`;
      const res = await node.rest.resolve(searchQuery).catch(() => null);

      if (res && res.loadType !== LoadType.ERROR && res.data) {
        return processSearchResult(res, options.requester);
      }
    }

    return { type: "SEARCH", tracks: [] };
  };

  client.manager = manager;
  client.logger.log("Kazagumo player manager initialized", "ready");
  return manager;
};