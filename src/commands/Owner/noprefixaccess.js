/** @format */

const NopAccess = require("../../schema/accessnop");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "noprefixaccess",
  aliases: ["npa"],
  category: "Owner",
  description: "Grant or revoke ability to manage no-prefix users",
  usage: "<add|remove|list> <user|id>",
  owner: true,
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const action = args[0]?.toLowerCase();

    if (!action || !["add", "remove", "list"].includes(action)) {
      return message.reply(C.v2(
        C.fail(`Usage: \`${prefix}noprefixaccess <add|remove|list> [user|id]\``)
      ));
    }

    if (action === "list") {
      const entries = await NopAccess.find().limit(25);
      if (!entries.length)
        return message.reply(C.v2(C.ok("No users have no-prefix manager access.")));

      const lines = await Promise.all(entries.map(async (entry, i) => {
        const user = await client.users.fetch(entry.userId).catch(() => null);
        return `\`${i + 1}.\` **${user?.tag || entry.userId}** (\`${entry.userId}\`)`;
      }));

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  NP Access Managers — ${entries.length}`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(lines.join("\n")))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return message.reply(C.v2(container));
    }

    const userId = message.mentions.users.first()?.id
      || args[1]?.replace(/[<@!>]/g, "");
    if (!userId || !/^\d{17,20}$/.test(userId))
      return message.reply(C.v2(C.fail("Provide a valid **user mention or ID**.")));

    if (action === "add") {
      const existing = await NopAccess.findOne({ userId });
      if (existing) return message.reply(C.v2(C.fail("User already has **NP manager** access.")));

      await NopAccess.create({ userId });
      const user = await client.users.fetch(userId).catch(() => null);
      return message.reply(C.v2(
        C.ok(`**${user?.tag || userId}** can now manage no-prefix users.`)
      ));
    }

    if (action === "remove") {
      const deleted = await NopAccess.findOneAndDelete({ userId });
      if (!deleted) return message.reply(C.v2(C.fail("User doesn't have **NP manager** access.")));

      const user = await client.users.fetch(userId).catch(() => null);
      return message.reply(C.v2(
        C.ok(`Removed NP manager access from **${user?.tag || userId}**.`)
      ));
    }
  },
};