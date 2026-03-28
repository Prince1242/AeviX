/** @format */

const mongoose = require("mongoose");
const Components = require("../../custom/components");
const { formatDuration } = require("../../utils/convert");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "ping",
  aliases: ["pong", "latency"],
  category: "Utility",
  description: "Check bot latency, API, database, and uptime",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const sent = await message.reply(C.v2(C.info("Measuring latency...")));
    const roundtrip = sent.createdTimestamp - message.createdTimestamp;
    const ws = client.ws.ping;

    /* ── Database ping ───────────────────────────── */
    let dbPing = -1;
    try {
      const dbStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbPing = Date.now() - dbStart;
    } catch {}

    /* ── Lavalink ping ───────────────────────────── */
    let llPing = "N/A";
    try {
      const node = [...client.manager.shoukaku.nodes.values()].find((n) => n.state === 2);
      if (node) {
        const llStart = Date.now();
        await node.rest.resolve("ytsearch:test").catch(() => null);
        llPing = `${Date.now() - llStart}ms`;
      }
    } catch {}

    /* ── Visual indicator ────────────────────────── */
    const quality = ws < 100 ? "Excellent" : ws < 200 ? "Good" : ws < 400 ? "Fair" : "Poor";
    const color = ws < 100 ? COLORS.success : ws < 200 ? COLORS.brand : ws < 400 ? COLORS.warn : COLORS.error;
    const bar = "█".repeat(Math.min(Math.round((1 - Math.min(ws, 500) / 500) * 15), 15))
      + "░".repeat(Math.max(15 - Math.round((1 - Math.min(ws, 500) / 500) * 15), 0));

    const container = C.container(color)
      .addTextDisplayComponents(C.text(`### ${MARK}  Pong!`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `**Connection Quality** — ${quality}\n\`${bar}\`\n\n` +
        `${e.dot} **WebSocket** · \`${ws}ms\`\n` +
        `${e.dot} **Roundtrip** · \`${roundtrip}ms\`\n` +
        `${e.dot} **Database** · \`${dbPing >= 0 ? dbPing + "ms" : "Error"}\`\n` +
        `${e.dot} **Lavalink** · \`${llPing}\`\n` +
        `${e.dot} **Uptime** · \`${formatDuration(client.uptime)}\`\n` +
        `${e.dot} **Shard** · \`#${message.guild.shardId}\``
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await sent.edit(C.v2(container));
  },
};