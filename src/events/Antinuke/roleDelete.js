/** @format */

const { handleAntiNuke } = require("../../utils/antinuke");

module.exports = {
  name: "roleDelete",
  run: async (client, role) => {
    await handleAntiNuke(client, role.guild, "antiRole", 32, {
      label: "Role Deletion",
      recover: () =>
        role.guild.roles.create({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          permissions: role.permissions,
          mentionable: role.mentionable,
          position: role.position,
          reason: "Aevix Antinuke: Restoring deleted role",
        }),
      fields: [{ name: "Role", value: `${role.name} (\`${role.id}\`)` }],
    });
  },
};