/** @format */

const { ApplicationCommandOptionType } = require("discord.js");
const Components = require("../../custom/components");

module.exports = {
  name: "loop",
  description: "Toggle the loop mode",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "mode",
      description: "Loop mode to set",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "Off", value: "none" },
        { name: "Track", value: "track" },
        { name: "Queue", value: "queue" },
      ],
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const player = client.manager.players.get(interaction.guildId);

    let mode = interaction.options.getString("mode");

    /* Cycle if no mode specified */
    if (!mode) {
      const modes = ["none", "track", "queue"];
      const cur = modes.indexOf(player.loop || "none");
      mode = modes[(cur + 1) % modes.length];
    }

    player.setLoop(mode);

    const labels = { none: "Off", track: "Track 🔂", queue: "Queue 🔁" };

    await interaction.reply(C.v2(
      C.ok(`Loop set to **${labels[mode]}**`)
    ));
  },
};