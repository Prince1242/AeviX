/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "roleUpdate",
  run: async (client, oldRole, newRole) => {
    await handleAntiNuke(client, oldRole.guild, "antiRole", 31, {
      label: "Role Update",
      recover: async () => {
        if (oldRole.name !== newRole.name) await newRole.edit({ name: oldRole.name }).catch(() => null);
      },
      fields: [{ name: "Role", value: `${oldRole.name} (\`${oldRole.id}\`)` }],
    });
  },
};