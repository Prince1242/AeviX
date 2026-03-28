/** @format */

// DEPRECATED: Import from "./playerUtils" instead.
// This shim exists for backward compatibility with unrewritten commands.
const { levenshtein, isTooSimilar } = require("./playerUtils");
module.exports = { levenshtein, isTooSimilar };