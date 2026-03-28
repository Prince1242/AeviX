/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /vote
 * ══════════════════════════════════════════════════════════════════ */

const Components = require("../../custom/components");
const { getVoteInfo } = require("../../utils/topgg");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "vote",
  description: "Vote for Aevix on top.gg and unlock perks",

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;

    await interaction.deferReply();

    const info = await getVoteInfo(client, interaction.user.id);

    const perks =
      `${e.premium} **Vote Perks:**\n` +
      `${e.dot} Music filters (Bass Boost, 8D, Nightcore, etc.)\n` +
      `${e.dot} Advanced queue management\n` +
      `${e.dot} Priority support\n` +
      `${e.dot} Extended command limits`;

    let status;
    if (info.voted) {
      const expiresTs = Math.round(info.expiresAt.getTime() / 1000);
      status =
        `${e.tick} **You've voted!** Thank you for supporting Aevix.\n` +
        `${e.dot} Rewards expire <t:${expiresTs}:R>\n` +
        `-# Vote again after expiry to keep your perks.`;
    } else {
      status =
        `${e.cross} **You haven't voted yet.**\n` +
        `Vote now to unlock premium features for **12 hours**!`;
    }

    const container = C.container(info.voted ? COLORS.success : COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Vote for Aevix`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`${status}\n\n${perks}`))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.link("Vote on Top.gg", client.config.links.topgg, e.premium),
          C.btn.link("Support Server", client.config.links.support)
        )
      )
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};