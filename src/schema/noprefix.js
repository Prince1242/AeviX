/** @format */

const { Schema, model } = require("mongoose");

const noprefixSchema = new Schema({
  noprefix: { type: Boolean, default: true },
  userId: { type: String, required: true, index: true },
  guildId: { type: String, default: null },
  expiresAt: { type: Date, default: null },
});

noprefixSchema.index({ userId: 1, noprefix: 1 });
noprefixSchema.index({ expiresAt: 1 }, {
  expireAfterSeconds: 0,
  partialFilterExpression: { expiresAt: { $ne: null } },
});

module.exports = model("Noprefix", noprefixSchema);