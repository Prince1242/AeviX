/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /ping
 * ══════════════════════════════════════════════════════════════════ */

const Components = require("../../custom/components");
const { formatDuration } = require("../../utils/convert");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "ping",
  description: "Check bot latency and uptime",

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;

    const start = Date.now();
    await interaction.deferReply();
    const roundtrip = Date.now() - start;
    const ws = client.ws.ping;

    const color = ws < 150 ? COLORS.success : ws < 400 ? COLORS.warn : COLORS.error;

    const container = C.container(color)
      .addTextDisplayComponents(C.text(`### ${MARK}  Pong!`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(
        C.text(
          `${e.dot} **WebSocket** · \`${ws}ms\`\n` +
            `${e.dot} **Roundtrip** · \`${roundtrip}ms\`\n` +
            `${e.dot} **Uptime** · \`${formatDuration(client.uptime)}\``
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};