/** @format */

const { Schema, model } = require("mongoose");

const warnConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  /* Auto-escalation tiers: when a user reaches X warns, apply action */
  tiers: [{
    count: { type: Number, required: true },
    action: { type: String, enum: ["mute", "kick", "ban"], required: true },
    duration: { type: Number, default: 0 }, /* mute duration in minutes, 0 = permanent */
  }],
  dmOnWarn: { type: Boolean, default: true },
  dmOnBan: { type: Boolean, default: true },
  logChannelId: { type: String, default: null },
});

module.exports = model("WarnConfig", warnConfigSchema);