/** @format */

const VoiceRole = require("../../schema/voicerole");

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    const guild = newState.guild;

    try {
      const config = await VoiceRole.findOne({ guildId: guild.id });
      if (!config?.roleId) {
        /* Config exists but roleId is empty — clean up */
        if (config) await VoiceRole.deleteOne({ guildId: guild.id });
        return;
      }

      const role = guild.roles.cache.get(config.roleId);
      if (!role) {
        /* Role was deleted — clean up config */
        await VoiceRole.deleteOne({ guildId: guild.id });
        return;
      }

      const member = newState.member;

      /* Member joins a VC */
      if (!oldState.channelId && newState.channelId) {
        if (!member.roles.cache.has(config.roleId)) {
          /* FIX: Don't delete config on temporary permission failure.
           * The role exists, it's just a permission issue. Log instead. */
          await member.roles.add(role).catch((err) => {
            client.logger?.log(
              `[VOICEROLE] Failed to add role in ${guild.name}: ${err.message}`,
              "warn"
            );
          });
        }
      }

      /* Member leaves a VC */
      if (oldState.channelId && !newState.channelId) {
        if (member.roles.cache.has(config.roleId)) {
          await member.roles.remove(role).catch((err) => {
            client.logger?.log(
              `[VOICEROLE] Failed to remove role in ${guild.name}: ${err.message}`,
              "warn"
            );
          });
        }
      }
    } catch (err) {
      /* FIX: Don't nuke the config on generic errors.
       * Only role deletion (handled above) should remove config. */
      client.logger?.log(
        `[VOICEROLE] Error in ${guild.name}: ${err.message}`,
        "error"
      );
    }
  },
};