/** @format */

const { Schema, model } = require("mongoose");

const CustomCmdSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  creatorId: { type: String, required: true },
  name: { type: String, required: true, lowercase: true, trim: true },
  response: { type: String, required: true },
  type: { type: String, enum: ["text", "embed", "reaction"], default: "text" },
  embedData: { type: Object, default: null },
  reactions: { type: [String], default: [] },
  usage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  enabled: { type: Boolean, default: true },
});

CustomCmdSchema.index({ guildId: 1, name: 1 }, { unique: true });

module.exports = model("CustomCmd", CustomCmdSchema);
