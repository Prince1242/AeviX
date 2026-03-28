/** @format */

const { Schema, model } = require("mongoose");

const EconomySchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, default: 100 },
  bank: { type: Number, default: 0 },
  daily: { type: Number, default: 0 },
  lastDaily: { type: Date, default: null },
  lastWork: { type: Date, default: null },
  lastBeg: { type: Date, default: null },
  inventory: { type: [{ item: String, quantity: Number }], default: [] },
  netWorth: { type: Number, default: 100 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  reputation: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  robberies: { type: Number, default: 0 },
  timesRobbed: { type: Number, default: 0 },
  lastRob: { type: Date, default: null },
  lastGamble: { type: Date, default: null },
});

module.exports = model("Economy", EconomySchema);
