/** @format */

const { Schema, model } = require("mongoose");

const TicketSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, unique: true },
  messageId: { type: String },
  creatorId: { type: String, required: true },
  participants: { type: [String], default: [] },
  status: { type: String, enum: ["open", "closed", "archived"], default: "open" },
  category: { type: String, default: "general" },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
  closedBy: { type: String, default: null },
  transcript: { type: String, default: null },
  transcriptUrl: { type: String, default: null },
  reason: { type: String, default: null },
});

module.exports = model("Tickets", TicketSchema);
