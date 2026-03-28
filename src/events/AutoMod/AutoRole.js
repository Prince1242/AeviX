/** @format */

const AutoRole = require("../../schema/autorole");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    try {
      if (!member?.guild) return;

      const autoRole = await AutoRole.findOne({ guildId: member.guild.id });
      if (!autoRole) return;

      const rolesToAdd = [];
      const roleIds = member.user.bot
        ? autoRole.botRoles || []
        : autoRole.humanRoles || [];

      for (const roleId of roleIds) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) rolesToAdd.push(role);
      }

      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd).catch(() => {
          console.log(`[AUTOROLE] Missing permissions in ${member.guild.name}`);
        });
      }
    } catch (err) {
      console.error("[AUTOROLE] Error:", err);
    }
  },
};