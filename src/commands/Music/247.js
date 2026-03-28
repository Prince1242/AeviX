/** @format */

const AutoReconnect = require("../../schema/247");
const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "247",
  aliases: ["twentyfourseven", "always"],
  category: "Music",
  description: "Toggle 24/7 mode — bot stays in VC even when empty",
  cooldown: 5,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);
    const guildId = message.guildId;

    const existing = await AutoReconnect.findOne({ Guild: guildId });

    if (existing) {
      await AutoReconnect.deleteOne({ Guild: guildId });
      player.data?.delete("247");

      const container = C.container(COLORS.warn)
        .addTextDisplayComponents(C.text(
          `${MARK} 24/7 mode **disabled**\n` +
          `-# Bot will leave when the queue ends and VC is empty`
        ));

      return message.reply(C.v2(container));
    }

    await AutoReconnect.findOneAndUpdate(
      { Guild: guildId },
      { Guild: guildId, TextId: message.channel.id, VoiceId: player.voiceId },
      { upsert: true }
    );
    player.data?.set("247", true);

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(
        `${MARK} 24/7 mode **enabled**\n` +
        `-# Bot will stay in <#${player.voiceId}> indefinitely`
      ));

    await message.reply(C.v2(container));
  },
};
