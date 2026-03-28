/** @format */

const { Schema, model } = require("mongoose");

const ignoreChannelSchema = new Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
});

ignoreChannelSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = model("ignorechannel", ignoreChannelSchema);