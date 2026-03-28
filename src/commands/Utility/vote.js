/** @format */

const Components = require("../../custom/components");
const { getVoteInfo } = require("../../utils/topgg");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "vote",
  aliases: [],
  category: "Utility",
  description: "Vote for Aevix on top.gg and unlock perks",
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const info = await getVoteInfo(client, message.author.id);

    const perks =
      `${e.premium} **Vote Perks:**\n` +
      `${e.dot} Music filters (Bass Boost, 8D, Nightcore, etc.)\n` +
      `${e.dot} Advanced queue management\n` +
      `${e.dot} Priority support\n` +
      `${e.dot} Extended command limits`;

    let status;
    if (info.voted) {
      const expiresTs = Math.round(info.expiresAt.getTime() / 1000);
      status = `${e.tick} **You've voted!** Rewards expire <t:${expiresTs}:R>`;
    } else {
      status = `${e.cross} **You haven't voted yet.** Vote to unlock perks for 12h!`;
    }

    const container = C.container(info.voted ? COLORS.success : COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  Vote for Aevix`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`${status}\n\n${perks}`))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.link("Vote on Top.gg", client.config.links.topgg, e.premium),
          C.btn.link("Support Server", client.config.links.support),
        )
      )
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};