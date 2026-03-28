/** @format */

const { version: djsVersion } = require("discord.js");
const os = require("os");
const Components = require("../../custom/components");
const { formatDuration } = require("../../utils/convert");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "botinfo",
  aliases: ["bi", "stats", "about"],
  category: "Utility",
  description: "View detailed bot statistics and system information",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const guilds = client.guilds.cache.size;
    const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const channels = client.guilds.cache.reduce((a, g) => a + g.channels.cache.size, 0);
    const commands = client.commands.size;
    const slash = client.slashCommands.size;
    const players = client.manager?.players?.size || 0;

    /* ── System info ─────────────────────────────── */
    const mem = process.memoryUsage();
    const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);
    const rss = (mem.rss / 1024 / 1024).toFixed(1);
    const cpuModel = os.cpus()[0]?.model?.split("@")[0]?.trim() || "Unknown";
    const cpuCores = os.cpus().length;
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    const platform = `${os.type()} ${os.release().split(".").slice(0, 2).join(".")}`;

    /* ── Lavalink nodes ──────────────────────────── */
    const nodes = [...(client.manager?.shoukaku?.nodes?.values() || [])];
    const connectedNodes = nodes.filter((n) => n.state === 2).length;
    const totalNodes = nodes.length;

    const stats =
      `${e.dot} **Servers** · \`${client.numb(guilds)}\`\n` +
      `${e.dot} **Users** · \`${client.numb(users)}\`\n` +
      `${e.dot} **Channels** · \`${client.numb(channels)}\`\n` +
      `${e.dot} **Commands** · \`${commands}\` prefix · \`${slash}\` slash\n` +
      `${e.dot} **Active Players** · \`${players}\`\n` +
      `${e.dot} **Lavalink Nodes** · \`${connectedNodes}/${totalNodes}\``;

    const system =
      `${e.dot} **Node.js** · \`${process.version}\`\n` +
      `${e.dot} **Discord.js** · \`v${djsVersion}\`\n` +
      `${e.dot} **Platform** · \`${platform}\`\n` +
      `${e.dot} **CPU** · \`${cpuModel}\` (\`${cpuCores}\` cores)\n` +
      `${e.dot} **Memory** · \`${heapUsed}/${heapTotal} MB\` heap · \`${rss} MB\` RSS\n` +
      `${e.dot} **System RAM** · \`${freeMem}/${totalMem} GB\` free\n` +
      `${e.dot} **Uptime** · \`${formatDuration(client.uptime)}\``;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Aevix — Statistics`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(
        C.section(
          `**Bot Statistics**\n${stats}`,
          client.user.displayAvatarURL({ size: 256 })
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`**System**\n${system}`))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.link("Invite", client.config.links.invite),
          C.btn.link("Support", client.config.links.support),
          C.btn.link("Vote", client.config.links.topgg, e.premium),
          C.btn.link("Dashboard", client.config.links.dashboard),
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};