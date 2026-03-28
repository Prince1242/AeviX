/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Discord OAuth2 Library
 *
 *  Raw Node.js https for all Discord API calls with multi-strategy
 *  auth fallback to handle environments that strip/reject headers.
 * ══════════════════════════════════════════════════════════════════ */

const https = require("https");

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_CACHE_TTL = 90_000;
const REQUEST_TIMEOUT = 15_000;

/* ── Helpers ─────────────────────────────────────── */

function avatarUrl(user) {
  if (!user?.id) return "https://cdn.discordapp.com/embed/avatars/0.png";
  if (!user.avatar) {
    const index = Number((BigInt(user.id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = user.avatar.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
}

function guildIconUrl(guild) {
  if (!guild?.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=256`;
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) return reject(new Error("No session object"));
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

/* ── Raw HTTPS Request ───────────────────────────── */

function httpsRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        ...headers,
        "Accept": "application/json",
        "User-Agent": "DiscordBot (https://aevix.gg, 2.0)",
      },
    };

    if (body) {
      const encoded = typeof body === "string" ? body : JSON.stringify(body);
      options.headers["Content-Length"] = Buffer.byteLength(encoded);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        clearTimeout(timer);
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    const timer = setTimeout(() => {
      req.destroy(new Error("Request timeout"));
    }, REQUEST_TIMEOUT);

    req.on("error", (err) => { clearTimeout(timer); reject(err); });

    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

/* ── Token Exchange ──────────────────────────────── */

async function exchangeCodeForToken(client, code, redirectUri) {
  if (!code) throw new Error("EXCHANGE_NO_CODE");
  if (!redirectUri) throw new Error("EXCHANGE_NO_REDIRECT");
  if (!client.config.clientId) throw new Error("EXCHANGE_NO_CLIENT_ID");
  if (!client.config.dashboard?.clientSecret) throw new Error("EXCHANGE_NO_SECRET");

  const body = new URLSearchParams({
    client_id: client.config.clientId,
    client_secret: client.config.dashboard.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  }).toString();

  client.logger.log(`[OAuth] Exchanging code for token`, "log");

  let res;
  try {
    res = await httpsRequest("POST", `${DISCORD_API}/oauth2/token`, {
      "Content-Type": "application/x-www-form-urlencoded",
    }, body);
  } catch (err) {
    throw new Error(`EXCHANGE_NETWORK: ${err.message}`);
  }

  if (res.status < 200 || res.status >= 300) {
    const data = res.data || {};
    const errDetail = data.error_description || data.error || JSON.stringify(data);
    client.logger.log(`[OAuth] Token exchange failed: ${res.status} — ${errDetail}`, "error");
    throw new Error(`EXCHANGE_FAILED_${res.status}: ${errDetail}`);
  }

  if (!res.data.access_token) throw new Error("EXCHANGE_NO_TOKEN");

  client.logger.log(`[OAuth] Token exchange OK (scope: ${res.data.scope}, type: ${res.data.token_type})`, "log");
  return res.data;
}

/* ── Token Refresh ───────────────────────────────── */

async function refreshAccessToken(req) {
  const oauth = req.session?.oauth;
  if (!oauth?.refreshToken) throw new Error("NO_REFRESH_TOKEN");

  const body = new URLSearchParams({
    client_id: req.client.config.clientId,
    client_secret: req.client.config.dashboard.clientSecret,
    grant_type: "refresh_token",
    refresh_token: oauth.refreshToken,
  }).toString();

  let res;
  try {
    res = await httpsRequest("POST", `${DISCORD_API}/oauth2/token`, {
      "Content-Type": "application/x-www-form-urlencoded",
    }, body);
  } catch (err) {
    throw new Error(`REFRESH_NETWORK: ${err.message}`);
  }

  if (res.status < 200 || res.status >= 300) {
    req.session.oauth = null;
    req.session.accessToken = null;
    await saveSession(req).catch(() => null);
    throw new Error("REFRESH_FAILED");
  }

  const data = res.data;
  req.session.oauth = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || oauth.refreshToken,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || oauth.scope || "",
    expiresAt: Date.now() + (Number(data.expires_in || 604800) * 1000),
  };
  req.session.accessToken = data.access_token;
  await saveSession(req);
  return req.session.oauth.accessToken;
}

/* ── Ensure Fresh Token ──────────────────────────── */

async function ensureFreshAccessToken(req) {
  if (!req.session?.oauth?.accessToken && req.session?.accessToken) {
    req.session.oauth = {
      accessToken: req.session.accessToken,
      refreshToken: null,
      tokenType: "Bearer",
      scope: "",
      expiresAt: Date.now() + 60_000,
    };
  }
  if (!req.session?.oauth?.accessToken) throw new Error("NO_TOKEN");

  const expiresAt = Number(req.session.oauth.expiresAt || 0);
  if (expiresAt && expiresAt - Date.now() <= 60_000 && req.session.oauth.refreshToken) {
    return await refreshAccessToken(req);
  }
  return req.session.oauth.accessToken;
}

/* ── Multi-Strategy Auth Request ─────────────────── */

/**
 * Tries multiple Authorization header formats against a Discord endpoint.
 * Returns first successful response. Used for both user and guild fetches.
 */
async function multiStrategyRequest(method, endpoint, token, log) {
  const strategies = [
    { name: "Bearer", header: `Bearer ${token}` },
    { name: "bearer", header: `bearer ${token}` },
    { name: "raw", header: token },
  ];

  for (const strat of strategies) {
    try {
      const res = await httpsRequest(method, `${DISCORD_API}${endpoint}`, {
        "Authorization": strat.header,
      });

      if (res.status >= 200 && res.status < 300) {
        if (log) log(`[OAuth] ${endpoint} OK via ${strat.name}`, "log");
        return { ok: true, status: res.status, data: res.data };
      }

      if (log) log(`[OAuth] ${endpoint} ${strat.name} → ${res.status}`, "debug");
    } catch {
      continue;
    }
  }

  return { ok: false, status: 403, data: null };
}

/* ── User Fetch ──────────────────────────────────── */

async function fetchDiscordUser(req, accessToken = null) {
  let token = accessToken;
  if (!token) token = await ensureFreshAccessToken(req);
  if (!token || typeof token !== "string") throw new Error("USER_NO_TOKEN");
  token = token.trim();

  const log = req?.client?.logger?.log?.bind(req.client.logger) || console.log;

  /* Strategy 1: /users/@me multi-auth */
  const res1 = await multiStrategyRequest("GET", "/users/@me", token, log);
  if (res1.ok && res1.data?.id) return res1.data;

  /* Strategy 2: /oauth2/@me (returns { user: {...} }) */
  log(`[OAuth] Trying /oauth2/@me`, "log");
  const res2 = await multiStrategyRequest("GET", "/oauth2/@me", token, log);
  if (res2.ok && res2.data?.user?.id) return res2.data.user;

  /* Strategy 3: Decode token → bot lookup */
  try {
    const firstPart = token.split(".")[0];
    if (firstPart) {
      const decoded = Buffer.from(firstPart, "base64").toString("utf-8");
      if (/^\d{17,20}$/.test(decoded) && decoded !== req?.client?.config?.clientId) {
        log(`[OAuth] Decoded user ID: ${decoded}, fetching via bot`, "log");
        const botToken = req?.client?.token;
        if (botToken) {
          const res = await httpsRequest("GET", `${DISCORD_API}/users/${decoded}`, {
            "Authorization": `Bot ${botToken}`,
          });
          if (res.status >= 200 && res.status < 300 && res.data?.id) {
            log(`[OAuth] User (bot lookup): ${res.data.username}`, "ready");
            return res.data;
          }
        }
      }
    }
  } catch {}

  throw new Error("USER_FETCH_EXHAUSTED: All strategies failed");
}

/* ── Discord API Request (generic, with fallback) ── */

async function discordRequest(req, endpoint) {
  const token = await ensureFreshAccessToken(req);
  const log = req?.client?.logger?.log?.bind(req.client.logger) || console.log;

  /* Try multi-strategy auth */
  const res = await multiStrategyRequest("GET", endpoint, token, log);

  if (res.ok) return res;

  /* If 401, try refresh then retry */
  if (res.status === 401 && req.session?.oauth?.refreshToken) {
    try {
      const newToken = await refreshAccessToken(req);
      const retryRes = await multiStrategyRequest("GET", endpoint, newToken, log);
      if (retryRes.ok) return retryRes;
    } catch {}
  }

  return { ok: false, status: res.status || 403, data: res.data };
}

/* ── Guild Fetch ─────────────────────────────────── */

async function fetchUserGuilds(req) {
  const cache = req.session?._guildCache;
  if (cache && Date.now() - cache.ts < GUILD_CACHE_TTL) return cache.data;

  const log = req?.client?.logger?.log?.bind(req.client.logger) || console.log;

  /* Try Discord API first */
  const res = await discordRequest(req, "/users/@me/guilds");

  if (res.ok && Array.isArray(res.data)) {
    req.session._guildCache = { data: res.data, ts: Date.now() };
    await saveSession(req).catch(() => null);
    return res.data;
  }

  /* Fallback: use bot cache to find guilds where user is a member */
  log(`[OAuth] Guild API failed (${res.status}), falling back to bot cache`, "warn");

  const userId = req.session?.user?.id;
  if (!userId) throw new Error("NO_USER_ID");

  const client = req.client;
  let guilds = [];

  try {
    if (client.cluster) {
      const results = await client.cluster.broadcastEval(
        (c, ctx) => {
          const out = [];
          for (const [, g] of c.guilds.cache) {
            const m = g.members.cache.get(ctx.userId);
            if (m) {
              const perms = m.permissions.bitfield.toString();
              out.push({
                id: g.id,
                name: g.name,
                icon: g.icon || null,
                owner: g.ownerId === ctx.userId,
                permissions: perms,
                member_count: g.memberCount,
              });
            }
          }
          return out;
        },
        { context: { userId } }
      );
      guilds = results.flat().filter(Boolean);
    } else {
      for (const [, g] of client.guilds.cache) {
        const m = g.members.cache.get(userId);
        if (m) {
          guilds.push({
            id: g.id,
            name: g.name,
            icon: g.icon || null,
            owner: g.ownerId === userId,
            permissions: m.permissions.bitfield.toString(),
            member_count: g.memberCount,
          });
        }
      }
    }
  } catch (err) {
    log(`[OAuth] Bot cache fallback failed: ${err.message}`, "error");
  }

  if (guilds.length > 0) {
    log(`[OAuth] Bot cache returned ${guilds.length} guilds for user ${userId}`, "log");
    req.session._guildCache = { data: guilds, ts: Date.now() };
    await saveSession(req).catch(() => null);
    return guilds;
  }

  throw new Error("Could not fetch guilds — API and cache both failed");
}

/* ── Exports ─────────────────────────────────────── */

module.exports = {
  DISCORD_API, avatarUrl, guildIconUrl, exchangeCodeForToken,
  refreshAccessToken, ensureFreshAccessToken, discordRequest,
  fetchDiscordUser, fetchUserGuilds, saveSession,
};