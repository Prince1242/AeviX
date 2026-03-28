/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "autoModerationRuleCreate",
  run: async (client, rule) => {
    await handleAntiNuke(client, rule.guild, "antiAutomodRule", 140, {
      label: "AutoMod Rule Creation",
      recover: () => rule.delete().catch(() => null),
      fields: [{ name: "Rule", value: rule.name || "Unknown" }],
    });
  },
};