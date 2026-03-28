/** @format */

const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean },
    threshold: { type: Number },
    timeframe: { type: Number },
  },
  { _id: false }
);

const AntiNukeSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  isEnabled: { type: Boolean, default: false },
  punishment: {
    type: String,
    enum: ["ban", "kick", "stripRoles"],
    default: "ban",
  },
  extraOwners: { type: [String], default: [] },
  whitelistUsers: { type: [String], default: [] },
  whitelistRoles: { type: [String], default: [] },
  logChannelId: { type: String, default: null },
  modules: {
    antiBan: { type: moduleSchema, default: () => ({}) },
    antiKick: { type: moduleSchema, default: () => ({}) },
    antiUnban: { type: moduleSchema, default: () => ({}) },
    antiRole: { type: moduleSchema, default: () => ({}) },
    antiChannel: { type: moduleSchema, default: () => ({}) },
    antiWebhook: { type: moduleSchema, default: () => ({}) },
    antiEmoji: { type: moduleSchema, default: () => ({}) },
    antiSticker: { type: moduleSchema, default: () => ({}) },
    antiEveryone: { type: moduleSchema, default: () => ({}) },
    antiGuildUpdate: { type: moduleSchema, default: () => ({}) },
    antiBotAdd: { type: moduleSchema, default: () => ({}) },
    antiMemberUpdate: { type: moduleSchema, default: () => ({}) },
    antiAutomodRule: { type: moduleSchema, default: () => ({}) },
  },
});

module.exports = mongoose.model("AntiNuke", AntiNukeSchema);