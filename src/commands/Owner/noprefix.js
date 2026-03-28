/** @format */

const Noprefix = require("../../schema/noprefix");
const { parseDuration } = require("../../utils/giveaway");
const { formatDuration } = require("../../utils/convert");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "noprefix",
  aliases: ["np"],
  category: "Owner",
  description: "Grant or revoke no-prefix access for a user",
  usage: "<add|remove|list> <user|id> [duration]",
  owner: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const action = args[0]?.toLowerCase();

    if (!action || !["add", "remove", "list"].includes(action)) {
      return message.reply(C.v2(
        C.fail(`Usage: \`${prefix}noprefix <add|remove|list> [user|id] [duration]\``)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  LIST
     * ═══════════════════════════════════════════════ */
    if (action === "list") {
      const entries = await Noprefix.find({ noprefix: true }).limit(25);

      if (!entries.length) {
        return message.reply(C.v2(C.ok("No users have no-prefix access.")));
      }

      const lines = await Promise.all(entries.map(async (entry, i) => {
        const user = await client.users.fetch(entry.userId).catch(() => null);
        const tag = user?.tag || entry.userId;
        const expiry = entry.expiresAt
          ? `Expires <t:${Math.round(entry.expiresAt.getTime() / 1000)}:R>`
          : "Permanent";
        return `\`${i + 1}.\` **${tag}** (\`${entry.userId}\`)\n${e.dot} ${expiry}`;
      }));

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  No-Prefix Users — ${entries.length}`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(lines.join("\n\n")))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return message.reply(C.v2(container));
    }

    /* ── Resolve user ────────────────────────────── */
    const userId = message.mentions.users.first()?.id
      || args[1]?.replace(/[<@!>]/g, "");

    if (!userId || !/^\d{17,20}$/.test(userId)) {
      return message.reply(C.v2(C.fail("Provide a valid **user mention or ID**.")));
    }

    /* ═══════════════════════════════════════════════
     *  ADD
     * ═══════════════════════════════════════════════ */
    if (action === "add") {
      const existing = await Noprefix.findOne({ userId, noprefix: true });
      if (existing) return message.reply(C.v2(C.fail("User already has **no-prefix** access.")));

      /* Parse optional duration */
      const durationStr = args[2];
      let expiresAt = null;
      if (durationStr) {
        const ms = parseDuration(durationStr);
        if (!ms) return message.reply(C.v2(C.fail("Invalid duration. Use `1h`, `7d`, `30d`, etc.")));
        expiresAt = new Date(Date.now() + ms);
      }

      await Noprefix.create({
        userId,
        noprefix: true,
        expiresAt,
      });

      const user = await client.users.fetch(userId).catch(() => null);
      const tag = user?.tag || userId;
      const durationText = expiresAt
        ? `for **${formatDuration(parseDuration(durationStr))}**`
        : "**permanently**";

      return message.reply(C.v2(
        C.ok(`Granted **no-prefix** access to **${tag}** ${durationText}.`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  REMOVE
     * ═══════════════════════════════════════════════ */
    if (action === "remove") {
      const deleted = await Noprefix.findOneAndDelete({ userId });
      if (!deleted) return message.reply(C.v2(C.fail("User does **not** have no-prefix access.")));

      const user = await client.users.fetch(userId).catch(() => null);
      const tag = user?.tag || userId;

      return message.reply(C.v2(
        C.ok(`Removed **no-prefix** access from **${tag}**.`)
      ));
    }
  },
};