/** @format */

const { hasVoted } = require("../../utils/topgg");
const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

/* ── Filter Map (same as slash version) ──────────── */
const FILTERS = {
  reset:      { label: "Reset",       payload: {},       free: true },
  bass:       { label: "Bass Boost",  payload: { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: i < 2 || i > 11 ? 0.1 : -0.05 })) } },
  "8d":       { label: "8D Audio",    payload: { rotation: { rotationHz: 0.2 } } },
  nightcore:  { label: "Nightcore",   payload: { equalizer: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }], timescale: { pitch: 1.2 }, tremolo: { depth: 0.3, frequency: 14 } } },
  pitch:      { label: "Pitch Up",    payload: { timescale: { pitch: 1.245, rate: 1.921 } } },
  lofi:       { label: "Lofi",        payload: { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: i <= 4 ? -0.25 + i * 0.05 : (i - 5) * 0.05 })) } },
  distortion: { label: "Distortion",  payload: { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: 0.5 - i * 0.05 })) } },
  speed:      { label: "Speed",       payload: { timescale: { speed: 1.501, pitch: 1.245, rate: 1.921 } } },
  vaporwave:  { label: "Vaporwave",   payload: { equalizer: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }], timescale: { pitch: 0.5 }, tremolo: { depth: 0.3, frequency: 14 } } },
  karaoke:    { label: "Karaoke",     payload: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220, filterWidth: 100 } } },
  tremolo:    { label: "Tremolo",     payload: { tremolo: { depth: 0.5, frequency: 10 } } },
  vibrato:    { label: "Vibrato",     payload: { vibrato: { depth: 0.5, frequency: 10 } } },
};

const FILTER_NAMES = Object.keys(FILTERS);

module.exports = {
  name: "filter",
  aliases: ["fx", "eq", "effect"],
  category: "Music",
  description: "Apply audio filters (bass, 8d, nightcore, etc.)",
  usage: "[filter name]",
  cooldown: 3,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);

    /* ── No args — show interactive select menu ──── */
    if (!args.length) {
      const uid = message.id;
      const options = FILTER_NAMES.map((key) => ({
        label: FILTERS[key].label,
        value: key,
        description: FILTERS[key].free ? "Free" : "Vote required",
        emoji: key === "reset" ? "🔄" : "🎛️",
      }));

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### 🎛️  Audio Filters`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `Select a filter from the menu below.\n` +
          `Current track: **${player.queue.current?.title || "None"}**\n\n` +
          `-# Or use \`${prefix}filter <name>\` directly\n` +
          `-# Available: \`${FILTER_NAMES.join("\`, \`")}\``
        ))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(
          C.row(C.select(`filter_${uid}`, "Choose a filter...", options))
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Music`));

      const msg = await message.reply(C.v2(container));

      const collector = msg.createMessageComponentCollector({
        time: 30_000,
        filter: (i) => i.user.id === message.author.id && i.customId === `filter_${uid}`,
      });

      collector.on("collect", async (i) => {
        const selected = i.values[0];
        await applyFilter(i, client, player, selected, true);
        collector.stop();
      });

      collector.on("end", async (_, reason) => {
        if (reason === "time") {
          await msg.edit(C.v2(
            C.container(COLORS.muted)
              .addTextDisplayComponents(C.text(`### 🎛️  Audio Filters`))
              .addSeparatorComponents(C.separator())
              .addTextDisplayComponents(C.text(`-# Filter selection timed out`))
          )).catch(() => null);
        }
      });

      return;
    }

    /* ── Direct filter application ───────────────── */
    const name = args[0].toLowerCase();
    await applyFilter(message, client, player, name, false);
  },
};

async function applyFilter(target, client, player, name, isInteraction) {
  const C = client.components;
  const e = client.emoji;
  const filter = FILTERS[name];

  const reply = isInteraction
    ? (payload) => target.reply(payload)
    : (payload) => target.reply(payload);

  if (!filter) {
    return reply(C.v2(C.fail(`Unknown filter \`${name}\`.\nAvailable: \`${FILTER_NAMES.join("\`, \`")}\``)));
  }

  /* Vote gate */
  if (!filter.free) {
    const voted = await hasVoted(client, (target.user || target.author).id);
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
          C.row(C.btn.link("Vote on Top.gg", client.config.links.topgg, e.premium))
        )
        .addTextDisplayComponents(C.text(FOOTER));

      return reply(isInteraction ? C.v2Ephemeral(container) : C.v2(container));
    }
  }

  try {
    await player.shoukaku.setFilters(filter.payload);
  } catch (err) {
    return reply(C.v2(C.fail(`Failed to apply filter: ${err.message}`)));
  }

  if (name === "reset") {
    return reply(C.v2(C.ok("All filters have been **reset**.")));
  }

  return reply(C.v2(
    C.ok(`Applied **${filter.label}** filter.\n-# Use \`${isInteraction ? "/" : ">"}filter reset\` to remove.`)
  ));
}
