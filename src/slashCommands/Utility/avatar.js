/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /avatar
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "avatar",
  description: "View a user's avatar in full size",
  options: [
    {
      name: "user",
      description: "Target user",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const user = interaction.options.getUser("user") || interaction.user;
    const url = user.displayAvatarURL({ size: 4096 });

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  ${user.displayName}'s Avatar`))
      .addSeparatorComponents(C.separator())
      .addMediaGalleryComponents(C.gallery(url))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(C.btn.link("Open in Browser", url))
      )
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.reply(C.v2(container));
  },
};