/** @format */

const { Schema, model } = require("mongoose");

const giveawaySchema = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  prize: { type: String, required: true },
  winners: { type: Number, default: 1 },
  endsAt: { type: Date, required: true },
  ended: { type: Boolean, default: false },
  entries: { type: [String], default: [] },
  winnerIds: { type: [String], default: [] },
  requiredRole: { type: String, default: null },
  bonusEntries: [{
    roleId: { type: String },
    entries: { type: Number, default: 1 },
  }],
});

giveawaySchema.index({ guildId: 1, ended: 1 });
giveawaySchema.index({ endsAt: 1, ended: 1 });

module.exports = model("Giveaway", giveawaySchema);