/** @format */

const { Schema, model } = require("mongoose");

const ReminderSchema = new Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, default: null },
  channelId: { type: String, required: true },
  messageId: { type: String, default: null },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  remindAt: { type: Date, required: true, index: true },
  delivered: { type: Boolean, default: false },
  deliveredAt: { type: Date, default: null },
  recurring: { type: Boolean, default: false },
  interval: { type: Number, default: null },
});

ReminderSchema.index({ remindAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("Reminder", ReminderSchema);
