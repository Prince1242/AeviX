/** @format */

const { Schema, model } = require("mongoose");

const blacklistSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  reason: { type: String, default: "No reason provided" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = model("Blacklist", blacklistSchema);