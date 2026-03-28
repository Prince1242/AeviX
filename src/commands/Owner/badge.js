/** @format */

const Badge = require("../../schema/badge");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

const VALID_BADGES = [
  "owner", "creator", "web", "dev", "admin", "staff",
  "supporter", "sponsor", "ownerspecial", "specialone",
  "bug", "noprefix", "vip", "friend", "partner", "loveone",
];

const BADGE_LABELS = {
  owner: "Owner", creator: "Creator", web: "Web", dev: "Developer",
  admin: "Admin", staff: "Staff", supporter: "Supporter", sponsor: "Sponsor",
  ownerspecial: "Owner Special", specialone: "Special One", bug: "Bug Hunter",
  noprefix: "No Prefix", vip: "VIP", friend: "Friend", partner: "Partner",
  loveone: "Love One",
};

module.exports = {
  name: "badge",
  aliases: ["badges"],
  category: "Owner",
  description: "Manage user badges",
  usage: "<add|remove|view|list> <user|id> [badge]",
  owner: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const action = args[0]?.toLowerCase();

    if (!action || !["add", "remove", "view", "list"].includes(action)) {
      return message.reply(C.v2(
        C.fail(
          `Usage: \`${prefix}badge <add|remove|view|list> [user|id] [badge]\`\n` +
          `Badges: \`${VALID_BADGES.join("`, `")}\``
        )
      ));
    }

    /* ═══════════════════════════════════════════════
     *  LIST — all badge types
     * ═══════════════════════════════════════════════ */
    if (action === "list") {
      const lines = VALID_BADGES.map((b) => `${e.dot} \`${b}\` — ${BADGE_LABELS[b]}`);

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Available Badges`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(lines.join("\n")))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return message.reply(C.v2(container));
    }

    /* ── Resolve user ────────────────────────────── */
    const userId = message.mentions.users.first()?.id
      || args[1]?.replace(/[<@!>]/g, "");
    if (!userId || !/^\d{17,20}$/.test(userId))
      return message.reply(C.v2(C.fail("Provide a valid **user mention or ID**.")));

    const user = await client.users.fetch(userId).catch(() => null);
    const tag = user?.tag || userId;

    /* ═══════════════════════════════════════════════
     *  VIEW — show user's badges
     * ═══════════════════════════════════════════════ */
    if (action === "view") {
      const data = await Badge.findOne({ userId });
      if (!data) return message.reply(C.v2(C.fail(`**${tag}** has no badge data.`)));

      const active = VALID_BADGES.filter((b) => data.badge?.[b]);
      const badgeText = active.length
        ? active.map((b) => `${e.dot} **${BADGE_LABELS[b]}**`).join("\n")
        : "No badges";

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Badges — ${tag}`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${badgeText}\n\n` +
          `${e.dot} **Command Count** · \`${data.count || 0}\`\n` +
          `${e.dot} **Blacklisted** · ${data.blacklisted ? e.cross : e.tick}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return message.reply(C.v2(container));
    }

    /* ── Badge name ──────────────────────────────── */
    const badgeName = args[2]?.toLowerCase();
    if (!badgeName || !VALID_BADGES.includes(badgeName)) {
      return message.reply(C.v2(
        C.fail(`Invalid badge. Use one of: \`${VALID_BADGES.join("`, `")}\``)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  ADD
     * ═══════════════════════════════════════════════ */
    if (action === "add") {
      await Badge.findOneAndUpdate(
        { userId },
        { $set: { [`badge.${badgeName}`]: true } },
        { upsert: true }
      );
      return message.reply(C.v2(
        C.ok(`Added **${BADGE_LABELS[badgeName]}** badge to **${tag}**.`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  REMOVE
     * ═══════════════════════════════════════════════ */
    if (action === "remove") {
      await Badge.findOneAndUpdate(
        { userId },
        { $set: { [`badge.${badgeName}`]: false } },
        { upsert: true }
      );
      return message.reply(C.v2(
        C.ok(`Removed **${BADGE_LABELS[badgeName]}** badge from **${tag}**.`)
      ));
    }
  },
};