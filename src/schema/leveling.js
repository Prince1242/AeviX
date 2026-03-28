/** @format */

const { Schema, model } = require("mongoose");

const LevelingSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  voiceXp: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },
  lastMessage: { type: Date, default: null },
  cooldown: { type: Date, default: null },
  enabled: { type: Boolean, default: true },
});

LevelingSchema.index({ guildId: 1, xp: -1 });
LevelingSchema.index({ guildId: 1, level: -1 });

module.exports = model("Leveling", LevelingSchema);
