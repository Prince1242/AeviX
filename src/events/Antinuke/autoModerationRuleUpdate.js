/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "autoModerationRuleUpdate",
  run: async (client, oldRule) => {
    await handleAntiNuke(client, oldRule.guild, "antiAutomodRule", 141, {
      label: "AutoMod Rule Update",
      fields: [{ name: "Rule", value: `\`${oldRule.name}\`` }],
    });
  },
};