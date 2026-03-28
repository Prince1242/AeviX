/** @format */

const AutoReconnect = require("../../schema/247");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "247",
  description: "Toggle 24/7 mode — keeps the bot connected when idle",
  inVoiceChannel: true,
  sameVoiceChannel: true,

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const guildId = interaction.guild.id;
    const voiceId = interaction.member.voice.channelId;
    const textId = interaction.channel.id;

    const existing = await AutoReconnect.findOne({ Guild: guildId });

    if (existing) {
      /* ── Disable 24/7 ──────────────────────────── */
      await AutoReconnect.deleteOne({ Guild: guildId });

      const container = C.container(COLORS.warn)
        .addTextDisplayComponents(
          C.text(
            `${MARK} 24/7 mode **disabled**\n` +
            `-# The bot will disconnect after inactivity.`
          )
        );

      return interaction.reply(C.v2(container));
    }

    /* ── Enable 24/7 ─────────────────────────────── */
    await AutoReconnect.create({
      Guild: guildId,
      TextId: textId,
      VoiceId: voiceId,
    });

    /* Create player if none exists */
    let player = client.manager.players.get(guildId);
    if (!player) {
      try {
        player = await client.manager.createPlayer({
          guildId,
          voiceId,
          textId,
          deaf: true,
          volume: 80,
        });
      } catch (err) {
        return interaction.reply(C.v2(
          C.fail(`Failed to create player: ${err.message}`)
        ));
      }
    }

    /* Clear any idle timeouts */
    const inactivityTimeout = player.data?.get("inactivityTimeout");
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
      player.data.delete("inactivityTimeout");
    }
    const idleSince = player.data?.get("idleSince");
    if (idleSince) player.data.delete("idleSince");

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(
        C.text(
          `${MARK} 24/7 mode **enabled**\n` +
          `${e.dot} Channel · <#${voiceId}>\n` +
          `-# The bot will stay connected and reconnect automatically.`
        )
      );

    await interaction.reply(C.v2(container));
  },
};