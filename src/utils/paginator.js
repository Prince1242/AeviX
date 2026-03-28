/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Paginator
 *
 *  Reusable Components V2 pagination with prev/next buttons.
 *
 *  Usage:
 *    const { paginate } = require("../utils/paginator");
 *
 *    // Auto-chunk items:
 *    await paginate(message, client, {
 *      title: "Queue",
 *      items: tracks.map((t, i) => `\`${i+1}.\` ${t.title}`),
 *      perPage: 10,
 *      userId: message.author.id,
 *    });
 *
 *    // Pre-built pages:
 *    await paginate(interaction, client, {
 *      title: "Help",
 *      pages: ["Page 1 content", "Page 2 content"],
 *      userId: interaction.user.id,
 *    });
 * ══════════════════════════════════════════════════════════════════ */

const { chunk } = require("./convert");
const Components = require("../custom/components");

/**
 * @param {Message|Interaction|TextChannel} target — where to send
 * @param {Client} client
 * @param {Object} options
 * @param {string[]} [options.items]       — raw items (auto-chunked)
 * @param {string[]} [options.pages]       — pre-built page strings
 * @param {number}   [options.perPage=10]  — items per page
 * @param {string}   [options.title]       — heading above content
 * @param {number}   [options.color]       — accent color
 * @param {string|false} [options.footer]  — footer text (false to hide)
 * @param {number}   [options.timeout=60000]
 * @param {string}   [options.userId]      — restrict nav to this user
 * @returns {Promise<Message|null>}
 */
async function paginate(target, client, options = {}) {
  const {
    items,
    perPage = 10,
    title,
    color = Components.COLORS.base,
    footer = Components.FOOTER,
    timeout = 60_000,
    userId,
  } = options;

  let { pages } = options;

  /* Build pages from items if not pre-built */
  if (!pages) {
    if (!items?.length) return null;
    pages = chunk(items, perPage).map((c) => c.join("\n"));
  }
  if (!pages.length) return null;

  const C = client.components;
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let current = 0;

  /* ── Page builder ──────────────────────────────── */
  function build(idx, disabled = false) {
    const container = C.container(color);

    if (title) {
      container
        .addTextDisplayComponents(C.text(`### ${title}`))
        .addSeparatorComponents(C.separator());
    }

    container.addTextDisplayComponents(C.text(pages[idx]));

    if (footer !== false) {
      container
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(footer || Components.FOOTER));
    }

    if (pages.length > 1) {
      container.addActionRowComponents(
        C.row(
          C.btn.secondary(`pg_p_${uid}`, "Prev", null, disabled || idx === 0),
          C.btn.secondary(`pg_i_${uid}`, `${idx + 1} / ${pages.length}`, null, true),
          C.btn.secondary(`pg_n_${uid}`, "Next", null, disabled || idx >= pages.length - 1),
        )
      );
    }

    return C.v2(container);
  }

  /* ── Send initial page ─────────────────────────── */
  const payload = build(0);
  let msg;

  const isInteraction = "commandName" in target || "customId" in target;
  const isMessage = "author" in target && !isInteraction;

  if (isInteraction) {
    msg = target.deferred || target.replied
      ? await target.editReply(payload).catch(() => null)
      : await target.reply({ ...payload, fetchReply: true }).catch(() => null);
  } else if (isMessage) {
    msg = await target.reply(payload).catch(() => null);
  } else {
    msg = await target.send(payload).catch(() => null);
  }

  if (!msg || pages.length <= 1) return msg;

  /* ── Collector ─────────────────────────────────── */
  const collector = msg.createMessageComponentCollector({
    time: timeout,
    filter: (i) => i.customId.endsWith(uid) && (!userId || i.user.id === userId),
  });

  collector.on("collect", async (i) => {
    if (i.customId === `pg_p_${uid}`) current = Math.max(0, current - 1);
    else if (i.customId === `pg_n_${uid}`) current = Math.min(pages.length - 1, current + 1);
    await i.update(build(current)).catch(() => null);
  });

  collector.on("end", async () => {
    await msg.edit(build(current, true)).catch(() => null);
  });

  return msg;
}

module.exports = { paginate };