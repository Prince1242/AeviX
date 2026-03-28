/** @format */

const { Schema, model } = require("mongoose");

const presetSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  presetType: { type: Number, required: true, default: 0 },
});

module.exports = model("Preset", presetSchema);