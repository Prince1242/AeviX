/** @format */

const { Schema, model } = require("mongoose");

const autoreactSchema = new Schema({
  guildId: { type: String, required: true },
  keyword: { type: String, required: true },
  emoji: { type: String, required: true },
});

autoreactSchema.index({ guildId: 1, keyword: 1 }, { unique: true });

module.exports = model("AutoReact", autoreactSchema);