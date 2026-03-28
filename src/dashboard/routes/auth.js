/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Dashboard Auth Routes
 *
 *  OAuth2 login, callback, logout, and status.
 * ══════════════════════════════════════════════════════════════════ */

const crypto = require("crypto");
const { Router } = require("express");
const {
  exchangeCodeForToken,
  fetchDiscordUser,
  avatarUrl,
  saveSession,
} = require("../lib/discord-oauth");

const router = Router();

/* ── Login ───────────────────────────────────────── */

router.get("/login", async (req, res) => {
  try {
    const cfg = req.client.config.dashboard;

    /* Validate config before redirecting */
    if (!cfg?.clientSecret || cfg.clientSecret.length < 10) {
      req.client.logger.log("[Auth] Cannot start login: clientSecret is missing or invalid in config", "error");
      return res.redirect("/?error=config_error");
    }
    if (!cfg?.callbackUrl) {
      req.client.logger.log("[Auth] Cannot start login: callbackUrl is missing in config", "error");
      return res.redirect("/?error=config_error");
    }

    /* Generate and persist state */
    const state = crypto.randomBytes(24).toString("hex");
    req.session.oauthState = state;

    /* CRITICAL: Await session save — do NOT swallow errors */
    try {
      await saveSession(req);
    } catch (err) {
      req.client.logger.log(`[Auth] Failed to save session before OAuth redirect: ${err.message}`, "error");
      return res.redirect("/?error=session_error");
    }

    const params = new URLSearchParams({
      client_id: req.client.config.clientId,
      response_type: "code",
      redirect_uri: cfg.callbackUrl,
      scope: "identify guilds",
      prompt: "consent",
      state,
    });

    req.client.logger.log(`[Auth] Login initiated, redirecting to Discord OAuth`, "log");
    return res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  } catch (err) {
    req.client.logger.log(`[Auth] Login route error: ${err.message}`, "error");
    return res.redirect("/?error=login_error");
  }
});

/* ── Callback ────────────────────────────────────── */

router.get("/callback", async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  /* Step 1: Check for Discord-side errors */
  if (oauthError) {
    req.client.logger.log(`[Auth] Discord returned error: ${oauthError}`, "warn");
    return res.redirect(`/?error=discord_${oauthError}`);
  }
  if (!code) {
    req.client.logger.log("[Auth] No authorization code in callback", "warn");
    return res.redirect("/?error=no_code");
  }

  /* Step 2: Validate state (CSRF protection) */
  const expectedState = req.session?.oauthState;
  if (!state || !expectedState) {
    req.client.logger.log(
      `[Auth] State validation failed — state: ${state ? "present" : "MISSING"}, session state: ${expectedState ? "present" : "MISSING"}. ` +
      `This usually means the session was not persisted. Check MongoDB connection and cookie settings.`,
      "error"
    );
    return res.redirect("/?error=invalid_state");
  }
  if (state !== expectedState) {
    req.client.logger.log("[Auth] State mismatch — possible CSRF or stale session", "error");
    return res.redirect("/?error=state_mismatch");
  }

  /* Step 3: Exchange code for token */
  let tokenData;
  try {
    tokenData = await exchangeCodeForToken(
      req.client,
      code,
      req.client.config.dashboard.callbackUrl
    );
  } catch (err) {
    req.client.logger.log(`[Auth] Token exchange failed: ${err.message}`, "error");

    /* Provide specific error hints in redirect */
    if (err.message.includes("401") || err.message.includes("SECRET")) {
      return res.redirect("/?error=invalid_secret");
    }
    if (err.message.includes("redirect") || err.message.includes("REDIRECT")) {
      return res.redirect("/?error=redirect_mismatch");
    }
    if (err.message.includes("TIMEOUT")) {
      return res.redirect("/?error=discord_timeout");
    }
    return res.redirect("/?error=token_exchange_failed");
  }

  /* Step 4: Validate scopes */
  const scopes = String(tokenData.scope || "").split(" ").filter(Boolean);
  if (!scopes.includes("guilds") || !scopes.includes("identify")) {
    req.client.logger.log(`[Auth] Incomplete scopes returned: ${tokenData.scope}`, "warn");
    return res.redirect("/?error=missing_scopes");
  }

  /* Step 5: Fetch user profile */
  let user;
  try {
    user = await fetchDiscordUser(req, tokenData.access_token);
  } catch (err) {
    req.client.logger.log(`[Auth] User fetch failed: ${err.message}`, "error");
    return res.redirect("/?error=user_fetch_failed");
  }

  if (!user?.id) {
    req.client.logger.log("[Auth] Discord returned invalid user data (no ID)", "error");
    return res.redirect("/?error=invalid_user");
  }

  /* Step 6: Persist session */
  try {
    req.session.oauthState = null;
    req.session._guildCache = null;
    req.session.oauth = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || "Bearer",
      scope: tokenData.scope || "",
      expiresAt: Date.now() + (Number(tokenData.expires_in || 604800) * 1000),
    };
    req.session.accessToken = tokenData.access_token;
    req.session.user = {
      id: user.id,
      username: user.username,
      globalName: user.global_name || null,
      avatar: user.avatar || null,
      avatarUrl: avatarUrl(user),
    };

    await saveSession(req);
    req.client.logger.log(`[Auth] Login successful: ${user.username} (${user.id})`, "ready");
    return res.redirect("/dashboard");
  } catch (err) {
    req.client.logger.log(`[Auth] Failed to save session after login: ${err.message}`, "error");
    return res.redirect("/?error=session_save_failed");
  }
});

/* ── Logout ──────────────────────────────────────── */

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) req.client?.logger?.log(`[Auth] Logout session destroy error: ${err.message}`, "warn");
    res.redirect("/");
  });
});

/* ── Status ──────────────────────────────────────── */

router.get("/status", (req, res) => {
  if (!req.session?.user) return res.json({ loggedIn: false });
  return res.json({ loggedIn: true, user: req.session.user });
});

module.exports = router;