/** @format */

const Warn = require("../../schema/warn");
const { paginate } = require("../../utils/paginator");
const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "warnings",
  aliases: ["warns"],
  category: "Moderation",
  description: "View warnings for a user",
  usage: "<user> [clear]",
  args: true,
  cooldown: 3,
  userPerms: ["ModerateMembers"],

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const user = message.mentions.users.first()
      || await client.users.fetch(args[0]?.replace(/[<@!>]/g, "")).catch(() => null);
    if (!user) return message.reply(C.v2(C.fail("Provide a valid **user mention or ID**.")));

    /* Clear */
    if (args[1]?.toLowerCase() === "clear") {
      const result = await Warn.deleteMany({ guildId: message.guild.id, userId: user.id });
      return message.reply(C.v2(result.deletedCount
        ? C.ok(`Cleared **${result.deletedCount}** warning(s) from **${user.tag}**.`)
        : C.caution(`**${user.tag}** has no warnings to clear.`)
      ));
    }

    const warns = await Warn.find({ guildId: message.guild.id, userId: user.id }).sort({ timestamp: -1 });
    if (!warns.length) return message.reply(C.v2(C.ok(`**${user.tag}** has **no warnings**.`)));

    const items = warns.map((w, i) => {
      const ts = Math.round(new Date(w.timestamp).getTime() / 1000);
      return `**${i + 1}.** \`#${w.warnId}\` · <t:${ts}:R>\n${e.dot} ${w.reason}\n${e.dot} By <@${w.moderatorId}>`;
    });

    await paginate(message, client, {
      items, perPage: 5,
      title: `${MARK}  Warnings — ${user.tag} (${warns.length})`,
      color: COLORS.warn, footer: FOOTER, userId: message.author.id,
    });
  },
};