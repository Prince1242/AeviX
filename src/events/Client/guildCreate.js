/** @format */

const { WebhookClient } = require("discord.js");
const {
  Webhooks: { guild_join },
} = require("../../config.js");
const moment = require("moment");
const { MARK, COLORS: BRAND_COLORS } = require("../../custom/components");

module.exports = {
  name: "guildCreate",
  run: async (client, guild) => {
    try {
      const web = new WebhookClient({ url: guild_join });
      const owner = await guild?.fetchOwner().catch(() => null);

      const vanity = guild.vanityURLCode
        ? `[${guild.name} Invite](https://discord.gg/${guild.vanityURLCode})`
        : "None";

      const embed = new client.embed()
        .c(BRAND_COLORS.brand)
        .thumb(guild.iconURL({ size: 1024 }))
        .t(`${MARK} Joined a Guild`)
        .addFields([
          { name: "Server Name", value: `> \`${guild.name}\`` },
          { name: "Server ID", value: `> \`${guild.id}\`` },
          {
            name: "Server Owner",
            value: `> \`${owner?.user?.displayName || "Unknown"}\` (${owner?.id || "Unknown"})`,
          },
          {
            name: "Member Count",
            value: `> \`${guild.memberCount}\` Members`,
          },
          {
            name: "Creation Date",
            value: `> \`${moment.utc(guild.createdAt).format("DD/MMM/YYYY")}\``,
          },
          { name: "Vanity", value: `> ${vanity}` },
        ])
        .f(`${MARK} Aevix · ${client.guilds.cache.size} servers`, client.user.displayAvatarURL())
        .ts();

      web.send({ embeds: [embed] });
    } catch (error) {
      client.logger.log(`Error in guildCreate event: ${error}`, "error");
    }
  },
};