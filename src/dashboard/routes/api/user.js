/** @format */

const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { avatarUrl } = require("../../lib/discord-oauth");
const Profile = require("../../../schema/profile");
const Badge = require("../../../schema/badge");
const SpotifyLink = require("../../../schema/spotify");

const router = Router();

/* GET /api/user/profile */
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [profile, badge, spotifyLink] = await Promise.all([
      Profile.findOne({ User: userId }),
      Badge.findOne({ userId }),
      SpotifyLink.findOne({ userId }),
    ]);

    const discordUser = await req.client.users.fetch(userId).catch(() => null);

    /* Build Spotify data */
    let spotify = null;
    if (spotifyLink) {
      spotify = {
        linked: true,
        spotifyId: spotifyLink.spotifyId,
        displayName: spotifyLink.displayName || spotifyLink.spotifyId,
        avatarUrl: spotifyLink.avatarUrl || null,
        linkedAt: spotifyLink.linkedAt,
        profileUrl: `https://open.spotify.com/user/${spotifyLink.spotifyId}`,
      };

      /* Try to fetch live Spotify data */
      try {
        const { fetchProfile, fetchUserPlaylists } = require("../../../utils/spotify");
        const config = req.client.config;

        const [liveProfile, playlists] = await Promise.all([
          fetchProfile(config, spotifyLink.spotifyId).catch(() => null),
          fetchUserPlaylists(config, spotifyLink.spotifyId, 6).catch(() => []),
        ]);

        if (liveProfile) {
          spotify.displayName = liveProfile.display_name || spotify.displayName;
          spotify.avatarUrl = liveProfile.images?.[0]?.url || spotify.avatarUrl;
          spotify.followers = liveProfile.followers?.total || 0;
          spotify.profileUrl = liveProfile.external_urls?.spotify || spotify.profileUrl;
        }

        spotify.playlists = playlists.slice(0, 6).map((p) => ({
          name: p.name,
          id: p.id,
          image: p.images?.[0]?.url || null,
          tracks: p.tracks?.total || 0,
          url: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`,
          owner: p.owner?.display_name || "Unknown",
        }));
      } catch {
        spotify.playlists = [];
      }
    }

    /* Build presence/status if available */
    let presence = null;
    if (discordUser) {
      try {
        const member = await req.client.guilds.cache.first()?.members?.fetch(userId).catch(() => null);
        if (member?.presence) {
          const activities = member.presence.activities || [];
          const spotifyActivity = activities.find((a) => a.name === "Spotify");
          const customStatus = activities.find((a) => a.type === 4);

          presence = {
            status: member.presence.status || "offline",
            customStatus: customStatus?.state || null,
          };

          if (spotifyActivity) {
            presence.spotify = {
              song: spotifyActivity.details || null,
              artist: spotifyActivity.state || null,
              album: spotifyActivity.assets?.largeText || null,
              albumArt: spotifyActivity.assets?.largeImage
                ? `https://i.scdn.co/image/${spotifyActivity.assets.largeImage.replace("spotify:", "")}`
                : null,
              startedAt: spotifyActivity.timestamps?.start || null,
              endsAt: spotifyActivity.timestamps?.end || null,
            };
          }
        }
      } catch {}
    }

    res.json({
      user: {
        id: userId,
        username: req.session.user.username,
        globalName: req.session.user.globalName,
        avatarUrl: req.session.user.avatarUrl || avatarUrl(req.session.user),
        banner: discordUser?.banner
          ? `https://cdn.discordapp.com/banners/${userId}/${discordUser.banner}.webp?size=600`
          : null,
        createdAt: discordUser?.createdAt || null,
      },
      profile: {
        bio: profile?.Bio || "",
        social: {
          twitter: profile?.SocialMedia?.twitter || { link: "", username: "" },
          instagram: profile?.SocialMedia?.instagram || { link: "", username: "" },
          discord: profile?.SocialMedia?.discord || { link: "", username: "" },
        },
      },
      badges: badge?.badge || {},
      commandCount: badge?.count || 0,
      spotify,
      presence,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* PUT /api/user/profile */
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { bio, social } = req.body;
    if (bio && bio.length > 200) return res.status(400).json({ error: "Bio max 200 chars" });
    const s = (v) => (typeof v === "string" ? v.trim().substring(0, 200) : "");
    const update = { User: userId };
    if (bio !== undefined) update.Bio = s(bio);
    if (social) {
      update.SocialMedia = {
        twitter: { link: s(social?.twitter?.link), username: s(social?.twitter?.username) },
        instagram: { link: s(social?.instagram?.link), username: s(social?.instagram?.username) },
        discord: { link: s(social?.discord?.link), username: s(social?.discord?.username) },
      };
    }
    await Profile.findOneAndUpdate({ User: userId }, update, { upsert: true, new: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* DELETE /api/user/spotify — Unlink Spotify */
router.delete("/spotify", requireAuth, async (req, res) => {
  try {
    await SpotifyLink.deleteOne({ userId: req.session.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;