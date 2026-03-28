/** @format */

const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { getPlayerState, executeMusicAction } = require("../../server");

const router = Router();

router.get("/:guildId", requireAuth, async (req, res) => {
  try { res.json(getPlayerState(req.client, req.params.guildId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/:guildId", requireAuth, async (req, res) => {
  try {
    const player = req.client.manager?.players?.get(req.params.guildId);
    if (!player) return res.status(404).json({ error: "No active player" });
    const { action, data } = req.body;
    if (!action) return res.status(400).json({ error: "Missing action" });
    await executeMusicAction(player, action, data);
    res.json(getPlayerState(req.client, req.params.guildId));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/:guildId/search", requireAuth, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.length < 2) return res.status(400).json({ error: "Query too short" });
    const results = await req.client.manager.search(query, { requester: { id: req.session.user.id, username: req.session.user.username } });
    const tracks = (results?.tracks || []).slice(0, 10).map((t) => ({ title: t.title, author: t.author, length: t.length, thumbnail: t.thumbnail, uri: t.uri, identifier: t.identifier }));
    res.json({ tracks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;