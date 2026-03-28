/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Top.gg Vote System
 *
 *  Provides vote checking, recording, and UI helpers for the voting
 *  system. Supports both REST API polling and webhook-based instant
 *  detection.
 *
 *  Usage:
 *    const { hasVoted, createVoteGateMessage } = require("../utils/topgg");
 *
 *    if (!(await hasVoted(client, userId))) {
 *      return message.channel.send(createVoteGateMessage(client));
 *    }
 * ══════════════════════════════════════════════════════════════════════ */

const VoteBypass = require("../schema/votebypassuser");
const { MARK, FOOTER, COLORS: BRAND_COLORS } = require("../custom/components");

/* ── Constants ───────────────────────────────────── */
const VOTE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

/* ── hasVoted ────────────────────────────────────── */

/**
 * Checks if a user has voted within the last 12 hours.
 * Strategy: DB cache first → top.gg API fallback → fail-open on error.
 *
 * @param {import("discord.js").Client} client
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function hasVoted(client, userId) {
  try {
    /* Step 1: Check DB cache (fast, no API call) */
    const cached = await VoteBypass.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    });
    if (cached) return true;

    /* Step 2: Check top.gg API */
    if (!client.topgg) return false;

    const voted = await client.topgg.hasVoted(userId);
    if (voted) {
      /* Step 3: Cache for future checks */
      await recordVote(userId);
    }

    return voted;
  } catch (err) {
    /* Step 4: Fail open — never block users on API errors */
    client.logger.log(`[Top.gg] Vote check error for ${userId}: ${err.message}`, "warn");
    return false;
  }
}

/* ── recordVote ──────────────────────────────────── */

/**
 * Records a vote in MongoDB with 12-hour TTL.
 * Uses upsert for idempotent handling of duplicate votes.
 *
 * @param {string} userId
 */
async function recordVote(userId) {
  try {
    const now = new Date();
    await VoteBypass.findOneAndUpdate(
      { userId },
      {
        userId,
        votedAt: now,
        expiresAt: new Date(now.getTime() + VOTE_DURATION_MS),
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    /* Non-critical — API check still works as fallback */
    console.error(`[Top.gg] recordVote error: ${err.message}`);
  }
}

/* ── getVoteInfo ─────────────────────────────────── */

/**
 * Returns detailed vote information for /vote command display.
 *
 * @param {import("discord.js").Client} client
 * @param {string} userId
 * @returns {Promise<{ voted: boolean, votedAt?: Date, expiresAt?: Date, source?: string, error?: string }>}
 */
async function getVoteInfo(client, userId) {
  try {
    const cached = await VoteBypass.findOne({
      userId,
      expiresAt: { $gt: new Date() },
    });

    if (cached) {
      return {
        voted: true,
        votedAt: cached.votedAt,
        expiresAt: cached.expiresAt,
        source: "cache",
      };
    }

    if (!client.topgg) return { voted: false };

    const voted = await client.topgg.hasVoted(userId);
    if (voted) {
      await recordVote(userId);
      const now = new Date();
      return {
        voted: true,
        votedAt: now,
        expiresAt: new Date(now.getTime() + VOTE_DURATION_MS),
        source: "api",
      };
    }

    return { voted: false };
  } catch (err) {
    return { voted: false, error: err.message };
  }
}

/* ── getBotStats ──────────────────────────────────── */

/**
 * Fetches bot stats from top.gg API.
 *
 * @param {import("discord.js").Client} client
 * @returns {Promise<{ votes: number, monthlyVotes: number, serverCount: number, shardCount: number }|null>}
 */
async function getBotStats(client) {
  try {
    if (!client.topgg) return null;

    const bot = await client.topgg.getBot(client.config.clientId);
    return {
      votes: bot.points || 0,
      monthlyVotes: bot.monthlyPoints || 0,
      serverCount: bot.server_count || 0,
      shardCount: bot.shard_count || 0,
    };
  } catch {
    return null;
  }
}

/* ── createVoteGateMessage ───────────────────────── */

/**
 * Creates a branded Components V2 message shown when a user
 * tries to use a vote-gated feature without having voted.
 *
 * @param {import("discord.js").Client} client
 * @returns {Object} Message payload (Components V2)
 */
function createVoteGateMessage(client) {
  const C = client.components;
  const e = client.emoji;

  const container = C.container(BRAND_COLORS.brand)
    .addTextDisplayComponents(C.text(`### ${MARK}  Vote Required`))
    .addSeparatorComponents(C.separator())
    .addTextDisplayComponents(
      C.text(
        `This feature requires a **top.gg vote**!\n\n` +
          `Voting is **free** and takes just a few seconds. Your vote ` +
          `unlocks premium features for **12 hours** and helps Aevix grow.\n\n` +
          `${e.premium} **What you unlock:**\n` +
          `${e.dot} Music filters (Bass Boost, 8D, Nightcore, etc.)\n` +
          `${e.dot} Advanced queue management\n` +
          `${e.dot} Priority support\n` +
          `${e.dot} Extended command limits`
      )
    )
    .addSeparatorComponents(C.separator())
    .addTextDisplayComponents(C.text(FOOTER))
    .addActionRowComponents(
      C.row(
        C.btn.link("Vote on Top.gg", client.config.links.topgg, e.premium),
        C.btn.link("Support Server", client.config.links.support)
      )
    );

  return C.v2(container);
}

/* ── sendVoteThankYouDM ──────────────────────────── */

/**
 * DMs a user after they vote with a branded thank-you message.
 * Silently skips if DMs are closed or user is unfetchable.
 *
 * @param {import("discord.js").Client} client
 * @param {string} userId
 */
async function sendVoteThankYouDM(client, userId) {
  try {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return;

    const C = client.components;
    const e = client.emoji;
    const expiresAt = Math.round((Date.now() + VOTE_DURATION_MS) / 1000);

    const container = C.container(BRAND_COLORS.success)
      .addTextDisplayComponents(C.text(`### ${MARK}  Thank You for Voting!`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(
        C.text(
          `Your vote for **Aevix** has been recorded!\n\n` +
            `${e.premium} **Rewards Unlocked:**\n` +
            `${e.dot} Music filters (Bass Boost, 8D, Nightcore, etc.)\n` +
            `${e.dot} Advanced queue management\n` +
            `${e.dot} Priority support\n` +
            `${e.dot} Extended command limits\n\n` +
            `${e.dot} **Expires:** <t:${expiresAt}:R>\n` +
            `-# Vote again in 12 hours to keep your rewards!`
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER))
      .addActionRowComponents(
        C.row(
          C.btn.link("Vote Again Later", client.config.links.topgg, e.premium),
          C.btn.link("Support Server", client.config.links.support)
        )
      );

    await user.send(C.v2(container)).catch(() => null);
  } catch {
    /* DMs closed or user unfetchable — silently skip */
  }
}

/* ── Exports ─────────────────────────────────────── */

module.exports = {
  hasVoted,
  recordVote,
  getVoteInfo,
  getBotStats,
  createVoteGateMessage,
  sendVoteThankYouDM,
  VOTE_DURATION_MS,
};