/** @format */

const Components = require("../../custom/components");
const { formatDuration } = require("../../utils/convert");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "uptime",
  aliases: ["up"],
  category: "Utility",
  description: "Check how long the bot has been running",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const uptime = client.uptime;
    const readyTs = Math.round((Date.now() - uptime) / 1000);
    const processUptime = formatDuration(process.uptime() * 1000);

    /* ── Uptime bar (visual) ─────────────────────── */
    const hours = uptime / 3_600_000;
    const target = 168; /* 7 days = 168 hours */
    const progress = Math.min(Math.round((hours / target) * 20), 20);
    const bar = "█".repeat(progress) + "░".repeat(20 - progress);
    const pct = Math.min((hours / target * 100), 100).toFixed(1);

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Uptime`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Bot Uptime** · \`${formatDuration(uptime)}\`\n` +
        `${e.dot} **Process Uptime** · \`${processUptime}\`\n` +
        `${e.dot} **Online Since** · <t:${readyTs}:f> (<t:${readyTs}:R>)\n\n` +
        `**Weekly Uptime**\n\`${bar}\` ${pct}%`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};