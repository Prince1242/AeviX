/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "roleCreate",
  run: async (client, role) => {
    await handleAntiNuke(client, role.guild, "antiRole", 30, {
      label: "Role Creation",
      recover: () => role.delete().catch(() => null),
      fields: [{ name: "Role", value: `${role.name} (\`${role.id}\`)` }],
    });
  },
};