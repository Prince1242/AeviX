/** @format */

const { Schema, model } = require("mongoose");

const ModLogSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  caseId: { type: Number, required: true },
  type: {
    type: String,
    required: true,
    enum: ["ban", "unban", "kick", "mute", "unmute", "warn", "softban", "hackban"],
  },
  userId: { type: String, required: true, index: true },
  userTag: { type: String, required: true },
  moderatorId: { type: String, required: true, index: true },
  moderatorTag: { type: String, required: true },
  reason: { type: String, default: "No reason provided" },
  duration: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  deleted: { type: Boolean, default: false },
});

ModLogSchema.index({ guildId: 1, caseId: -1 });
ModLogSchema.index({ guildId: 1, userId: 1 });

module.exports = model("ModLog", ModLogSchema);
