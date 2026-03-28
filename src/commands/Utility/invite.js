/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "invite",
  aliases: ["inv"],
  category: "Utility",
  description: "Get the bot invite and useful links",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Invite Aevix`))
      .addSeparatorComponents(C.separator())
      .addSectionComponents(
        C.section(
          `Add **Aevix** to your server for premium\nmusic, moderation, security, and automation.\n\n` +
          `${e.dot} **${client.guilds.cache.size}** servers\n` +
          `${e.dot} **${client.numb(client.guilds.cache.reduce((a, g) => a + g.memberCount, 0))}** users`,
          client.user.displayAvatarURL({ size: 256 })
        )
      )
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.link("Invite", client.config.links.invite),
          C.btn.link("Support", client.config.links.support),
          C.btn.link("Vote", client.config.links.topgg, e.premium),
          C.btn.link("Dashboard", client.config.links.dashboard),
        )
      )
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};