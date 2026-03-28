/** @format */

const mongoose = require("mongoose");

/* ── Vote Bypass Schema ──────────────────────────────────────────────────
 * Tracks users who have voted on top.gg.
 *
 * - userId:    Discord user ID (unique, indexed for fast lookups)
 * - votedAt:   When the vote was recorded
 * - expiresAt: When the vote reward expires (12 hours after voting)
 *
 * A TTL index on expiresAt causes MongoDB to automatically delete
 * expired documents — no cron job or manual cleanup needed.
 * ─────────────────────────────────────────────────────────────────────── */
const voteSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

/* TTL index — MongoDB auto-removes documents when expiresAt passes */
voteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("VoteBypass", voteSchema);