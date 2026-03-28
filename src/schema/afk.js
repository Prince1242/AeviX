/** @format */

const { Schema, model } = require("mongoose");

const afkSchema = new Schema({
  Guild: { type: String, required: true },
  Member: { type: String, required: true },
  Reason: { type: String, default: "AFK" },
  Time: { type: Number, default: Date.now },
});

afkSchema.index({ Guild: 1, Member: 1 }, { unique: true });

module.exports = model("Afk", afkSchema);