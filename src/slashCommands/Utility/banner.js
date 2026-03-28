/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /banner
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "banner",
  description: "View a user's banner",
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
    const target = interaction.options.getUser("user") || interaction.user;

    await interaction.deferReply();

    /* Force-fetch to get banner data */
    const user = await client.users.fetch(target.id, { force: true });
    const url = user.bannerURL({ size: 4096 });

    if (!url) {
      return interaction.editReply(
        C.v2(C.fail(`**${user.displayName}** doesn't have a banner.`))
      );
    }

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  ${user.displayName}'s Banner`))
      .addSeparatorComponents(C.separator())
      .addMediaGalleryComponents(C.gallery(url))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(C.btn.link("Open in Browser", url))
      )
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};