/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /botinfo
 * ══════════════════════════════════════════════════════════════════ */

const { version: djsVersion } = require("discord.js");
const Components = require("../../custom/components");
const { formatDuration } = require("../../utils/convert");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "botinfo",
  description: "View bot statistics and system information",

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;

    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const channels = client.guilds.cache.reduce((a, g) => a + g.channels.cache.size, 0);
    const commands = client.commands.size + client.slashCommands.size;
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const stats =
      `${e.dot} **Servers** · \`${client.numb(guilds)}\`\n` +
      `${e.dot} **Users** · \`${client.numb(users)}\`\n` +
      `${e.dot} **Channels** · \`${client.numb(channels)}\`\n` +
      `${e.dot} **Commands** · \`${commands}\``;

    const system =
      `${e.dot} **Node.js** · \`${process.version}\`\n` +
      `${e.dot} **Discord.js** · \`v${djsVersion}\`\n` +
      `${e.dot} **Memory** · \`${mem} MB\`\n` +
      `${e.dot} **Uptime** · \`${formatDuration(client.uptime)}\``;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Aevix — Bot Info`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(
        C.section(
          `**Statistics**\n${stats}\n\n**System**\n${system}`,
          client.user.displayAvatarURL({ size: 256 })
        )
      )
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.link("Invite", client.config.links.invite),
          C.btn.link("Support", client.config.links.support),
          C.btn.link("Vote", client.config.links.topgg, e.premium),
          C.btn.link("Dashboard", client.config.links.dashboard, e.config)
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.reply(C.v2(container));
  },
};