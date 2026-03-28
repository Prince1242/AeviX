/** @format */

const { Schema, model } = require("mongoose");

const spotifyLinkSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  spotifyId: { type: String, required: true },
  displayName: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  linkedAt: { type: Date, default: Date.now },
});

module.exports = model("SpotifyLink", spotifyLinkSchema);