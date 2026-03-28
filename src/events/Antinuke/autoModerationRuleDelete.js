/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "autoModerationRuleDelete",
  run: async (client, rule) => {
    await handleAntiNuke(client, rule.guild, "antiAutomodRule", 142, {
      label: "AutoMod Rule Deletion",
      fields: [{ name: "Rule", value: `\`${rule.name}\`` }],
    });
  },
};