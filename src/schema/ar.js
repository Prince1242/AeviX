/** @format */

const { Schema, model } = require("mongoose");

const autoresponderSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  autoresponses: [
    {
      trigger: { type: String, required: true },
      response: { type: String, required: true },
    },
  ],
});

/* ── BREAKING FIX: Model name was "Autoresponser" (typo).
 *  Changed to "Autoresponder". If you have existing data,
 *  rename the MongoDB collection:
 *    db.autoresponsers.renameCollection("autoresponders")
 * ────────────────────────────────────────────────────── */
module.exports = model("Autoresponder", autoresponderSchema);