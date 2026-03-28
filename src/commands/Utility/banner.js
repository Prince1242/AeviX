/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "banner",
  aliases: ["bn"],
  category: "Utility",
  description: "View a user's banner or the server banner",
  usage: "[@user|id|server]",
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    /* Server banner */
    if (args[0]?.toLowerCase() === "server" || args[0]?.toLowerCase() === "guild") {
      const url = message.guild.bannerURL({ size: 4096 });
      if (!url) return message.reply(C.v2(C.fail("This server doesn't have a banner.")));

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  ${message.guild.name}'s Banner`))
        .addSeparatorComponents(C.separator())
        .addMediaGalleryComponents(C.gallery(url))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(C.row(C.btn.link("Open in Browser", url)))
        .addTextDisplayComponents(C.text(FOOTER));

      return message.reply(C.v2(container));
    }

    /* User banner */
    const target = message.mentions.users.first()
      || (args[0] ? await client.users.fetch(args[0].replace(/[<@!>]/g, "")).catch(() => null) : null)
      || message.author;

    const user = await client.users.fetch(target.id, { force: true });
    const url = user.bannerURL({ size: 4096 });

    if (!url) {
      /* Show accent color if no banner */
      if (user.accentColor) {
        const hex = `#${user.accentColor.toString(16).padStart(6, "0")}`;
        return message.reply(C.v2(
          C.container(user.accentColor)
            .addTextDisplayComponents(C.text(`### ${MARK}  ${user.displayName}'s Banner Color`))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(
              `${user.displayName} doesn't have a banner, but their accent color is **${hex}**.`
            ))
            .addSeparatorComponents(C.separator())
            .addTextDisplayComponents(C.text(FOOTER))
        ));
      }
      return message.reply(C.v2(C.fail(`**${user.displayName}** doesn't have a banner.`)));
    }

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  ${user.displayName}'s Banner`))
      .addSeparatorComponents(C.separator())
      .addMediaGalleryComponents(C.gallery(url))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(C.row(C.btn.link("Open in Browser", url)))
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};