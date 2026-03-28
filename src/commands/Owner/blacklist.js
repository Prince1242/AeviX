/** @format */

const Blacklist = require("../../schema/blacklist");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "blacklist",
  aliases: ["bl"],
  category: "Owner",
  description: "Blacklist or unblacklist a user from using the bot",
  usage: "<add|remove|list> <user|id> [reason]",
  owner: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const action = args[0]?.toLowerCase();

    if (!action || !["add", "remove", "list"].includes(action)) {
      return message.reply(C.v2(
        C.fail(`Usage: \`${prefix}blacklist <add|remove|list> [user|id] [reason]\``)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  LIST
     * ═══════════════════════════════════════════════ */
    if (action === "list") {
      const entries = await Blacklist.find().sort({ timestamp: -1 }).limit(20);

      if (!entries.length) {
        return message.reply(C.v2(C.ok("No users are currently blacklisted.")));
      }

      const lines = entries.map((entry, i) => {
        const ts = Math.round(new Date(entry.timestamp).getTime() / 1000);
        return `\`${i + 1}.\` <@${entry.userId}> (\`${entry.userId}\`)\n${e.dot} ${entry.reason} · <t:${ts}:R>`;
      });

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Blacklisted Users — ${entries.length}`))
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
      if (client.ownerIds?.includes(userId) || userId === client.owner) {
        return message.reply(C.v2(C.fail("Cannot blacklist a **bot owner**.")));
      }

      const existing = await Blacklist.findOne({ userId });
      if (existing) return message.reply(C.v2(C.fail("User is already **blacklisted**.")));

      const reason = args.slice(2).join(" ") || "No reason provided";
      await Blacklist.create({ userId, reason });

      const user = await client.users.fetch(userId).catch(() => null);
      const tag = user?.tag || userId;

      return message.reply(C.v2(
        C.ok(`**${tag}** has been **blacklisted**.\n${e.dot} Reason: ${reason}`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  REMOVE
     * ═══════════════════════════════════════════════ */
    if (action === "remove") {
      const deleted = await Blacklist.findOneAndDelete({ userId });
      if (!deleted) return message.reply(C.v2(C.fail("User is **not blacklisted**.")));

      const user = await client.users.fetch(userId).catch(() => null);
      const tag = user?.tag || userId;

      return message.reply(C.v2(
        C.ok(`**${tag}** has been **removed** from the blacklist.`)
      ));
    }
  },
};