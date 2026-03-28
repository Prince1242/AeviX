/** @format */

const { ApplicationCommandOptionType } = require("discord.js");
const { hasVoted } = require("../../utils/topgg");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

/* ── Filter Map ──────────────────────────────────── */
const FILTERS = {
  reset:      { label: "Reset",       payload: {},        free: true },
  bass:       { label: "Bass Boost",   payload: { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: i < 2 || i > 11 ? 0.1 : -0.05 })) } },
  "8d":       { label: "8D Audio",     payload: { rotation: { rotationHz: 0.2 } } },
  nightcore:  { label: "Nightcore",    payload: { equalizer: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }], timescale: { pitch: 1.2 }, tremolo: { depth: 0.3, frequency: 14 } } },
  pitch:      { label: "Pitch Up",     payload: { timescale: { pitch: 1.245, rate: 1.921 } } },
  lofi:       { label: "Lofi",         payload: { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: i <= 4 ? -0.25 + i * 0.05 : (i - 5) * 0.05 })) } },
  distortion: { label: "Distortion",   payload: { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: 0.5 - i * 0.05 })) } },
  speed:      { label: "Speed",        payload: { timescale: { speed: 1.501, pitch: 1.245, rate: 1.921 } } },
  vaporwave:  { label: "Vaporwave",    payload: { equalizer: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }], timescale: { pitch: 0.5 }, tremolo: { depth: 0.3, frequency: 14 } } },
  karaoke:    { label: "Karaoke",      payload: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220, filterWidth: 100 } } },
  tremolo:    { label: "Tremolo",      payload: { tremolo: { depth: 0.5, frequency: 10 } } },
  vibrato:    { label: "Vibrato",      payload: { vibrato: { depth: 0.5, frequency: 10 } } },
};

const FILTER_CHOICES = Object.entries(FILTERS).map(([key, f]) => ({
  name: `${f.label}${f.free ? "" : " (Vote)"}`,
  value: key,
}));

module.exports = {
  name: "filter",
  description: "Apply an audio filter to the player",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "name",
      description: "Filter to apply",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: FILTER_CHOICES,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(interaction.guildId);
    const name = interaction.options.getString("name");
    const filter = FILTERS[name];

    if (!filter)
      return interaction.reply(C.v2(C.fail("Unknown filter.")));

    /* ── Vote gate for premium filters ───────────── */
    if (!filter.free) {
      const voted = await hasVoted(client, interaction.user.id);
      if (!voted) {
        const container = C.container(COLORS.brand)
          .addTextDisplayComponents(C.text(`### ${MARK}  Vote Required`))
          .addSeparatorComponents(C.separator())
          .addTextDisplayComponents(C.text(
            `Audio filters require a **top.gg vote**.\n` +
            `Voting is free and unlocks **all filters** for 12 hours.\n\n` +
            `${e.dot} Reset filter is always free.`
          ))
          .addSeparatorComponents(C.separator())
          .addActionRowComponents(
            C.row(
              C.btn.link("Vote on Top.gg", client.config.links.topgg, e.premium)
            )
          )
          .addTextDisplayComponents(C.text(FOOTER));

        return interaction.reply(C.v2(container));
      }
    }

    await interaction.deferReply();

    try {
      await player.shoukaku.setFilters(filter.payload);
    } catch (err) {
      return interaction.editReply(C.v2(
        C.fail(`Failed to apply filter: ${err.message}`)
      ));
    }

    if (name === "reset") {
      return interaction.editReply(C.v2(C.ok("All filters have been **reset**.")));
    }

    await interaction.editReply(C.v2(
      C.ok(`Applied **${filter.label}** filter.\n-# Use \`/filter reset\` to remove.`)
    ));
  },
};