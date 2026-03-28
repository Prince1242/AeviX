/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /snipe
 *  View the last deleted message in this channel.
 * ══════════════════════════════════════════════════════════════════ */

const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;
const MAX_AGE_MS = 10 * 60 * 1000; /* 10 minutes */

module.exports = {
  name: "snipe",
  description: "View the last deleted message in this channel",

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;

    const data = client.snipes?.get(interaction.channel.id);

    if (!data) {
      return interaction.reply(C.v2(
        C.fail("There's nothing to snipe in this channel.")
      ));
    }

    /* ── Check expiry ────────────────────────────── */
    if (Date.now() - data.time > MAX_AGE_MS) {
      client.snipes.delete(interaction.channel.id);
      return interaction.reply(C.v2(
        C.fail("The last deleted message has **expired** (>10 minutes ago).")
      ));
    }

    const deletedTs = Math.round(data.time / 1000);
    const content = data.content || "*No text content*";
    const author = data.author;

    const body = [
      `**${author.displayName}** (\`@${author.username}\`)`,
      "",
      content.length > 1500 ? content.substring(0, 1500) + "..." : content,
      "",
      `-# Deleted <t:${deletedTs}:R>`,
    ].join("\n");

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Sniped Message`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(
        C.section(body, author.displayAvatarURL({ size: 128 }))
      );

    /* ── Attachment ───────────────────────────────── */
    if (data.image) {
      container
        .addSeparatorComponents(C.separator())
        .addMediaGalleryComponents(C.gallery(data.image));
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.reply(C.v2(container));
  },
};