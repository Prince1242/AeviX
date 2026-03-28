/** @format */

const { Schema, model } = require("mongoose");

const warnSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, default: "No reason provided" },
  timestamp: { type: Date, default: Date.now },
  warnId: { type: String, required: true },
});

warnSchema.index({ guildId: 1, userId: 1 });

module.exports = model("Warn", warnSchema);