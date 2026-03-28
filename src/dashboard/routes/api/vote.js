/** @format */

const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { getVoteInfo, getBotStats } = require("../../../utils/topgg");

const router = Router();

router.get("/status", requireAuth, async (req, res) => {
  try {
    const info = await getVoteInfo(req.client, req.session.user.id);
    res.json({ voted: info.voted, votedAt: info.votedAt || null, expiresAt: info.expiresAt || null, voteUrl: req.client.config.links.topgg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await getBotStats(req.client);
    res.json(stats || { votes: 0, monthlyVotes: 0, serverCount: req.client.guilds.cache.size });
  } catch { res.json({ votes: 0, monthlyVotes: 0, serverCount: req.client.guilds.cache.size }); }
});

module.exports = router;