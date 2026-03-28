/** @format */

const { Schema, model } = require("mongoose");

const autoReconnectSchema = new Schema({
  Guild: { type: String, required: true, unique: true, index: true },
  TextId: { type: String, required: true },
  VoiceId: { type: String, required: true },
});

module.exports = model("autoreconnect", autoReconnectSchema);