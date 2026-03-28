/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Player Start (Now Playing)
 *
 *  Two modes:
 *  1. SETUP CHANNEL — Updates the existing panel message in-place.
 *     No separate NP message, no extra collector (setup buttons handle it).
 *  2. NORMAL CHANNEL — Sends a full NP card with buttons + filter menu.
 * ══════════════════════════════════════════════════════════════════ */

const {
  EmbedBuilder, WebhookClient, AttachmentBuilder, MessageFlags,
} = require("discord.js");
const moment = require("moment");
require("moment-duration-format");

const Setup = require("../../schema/setup");
const Presets = require("../../schema/preset");
const VcStatus = require("../../schema/vcstatus");
const { hasVoted } = require("../../utils/topgg");
const { addToHistory } = require("../../utils/playerUtils");
const { convertTime } = require("../../utils/convert");
const Components = require("../../custom/components");
const { Webhooks: { player_create } } = require("../../config.js");

const { MARK, FOOTER, COLORS } = Components;

/* ── Card generators (optional deps) ─────────────── */
let musicCard, Classic, canvafy;
try { musicCard = require("musicard-quartz").musicCard; } catch {}
try { Classic = require("musicard").Classic; } catch {}
try { canvafy = require("canvafy"); } catch {}

/* ── Filter Config ───────────────────────────────── */

const FILTER_MAP = {
  filter_clear:   {},
  filter_bass:    { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: i < 2 || i > 11 ? 0.1 : -0.05 })) },
  filter_8d:      { rotation: { rotationHz: 0.2 } },
  filter_night:   { equalizer: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }], timescale: { pitch: 1.2 }, tremolo: { depth: 0.3, frequency: 14 } },
  filter_pitch:   { timescale: { pitch: 1.245, rate: 1.921 } },
  filter_lofi:    { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: i <= 4 ? -0.25 + i * 0.05 : (i - 5) * 0.05 })) },
  filter_distort: { equalizer: Array.from({ length: 14 }, (_, i) => ({ band: i, gain: 0.5 - i * 0.05 })) },
  filter_speed:   { timescale: { speed: 1.501, pitch: 1.245, rate: 1.921 } },
  filter_vapor:   { equalizer: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.3 }], timescale: { pitch: 0.5 }, tremolo: { depth: 0.3, frequency: 14 } },
};

const FILTER_LABELS = {
  filter_clear: "Reset",   filter_bass: "Bass Boost",  filter_8d: "8D Audio",
  filter_night: "Nightcore", filter_pitch: "Pitch",     filter_lofi: "Lofi",
  filter_distort: "Distortion", filter_speed: "Speed",  filter_vapor: "Vaporwave",
};

const FREE_FILTERS = new Set(["filter_clear"]);

/* ── Helpers ─────────────────────────────────────── */

function cleanTitle(raw) {
  return raw
    .replace(/(?:hd|full|video|official|4k|8k)/gi, "")
    .replace(/[^\p{L}\p{N}\s\u0900-\u097F]/gu, "")
    .replace(/\s+/g, " ").trim() || raw;
}

function createButtonRow(paused) {
  return Components.row(
    Components.btn.secondary(paused ? "resume" : "pause", null, paused ? "▶️" : "⏸️"),
    Components.btn.secondary("skip", null, "⏭️"),
    Components.btn.danger("stop", null, "⏹️"),
    Components.btn.secondary("loop", null, "🔁"),
    Components.btn.secondary("shuffle", null, "🔀"),
  );
}

function createFilterMenu() {
  return Components.row(
    Components.select("aevix_filters", "Select a filter", [
      { label: "Reset Filters",  value: "filter_clear",   emoji: "🔄" },
      { label: "Bass Boost",     value: "filter_bass",    emoji: "🔊" },
      { label: "8D Audio",       value: "filter_8d",      emoji: "🎧" },
      { label: "Nightcore",      value: "filter_night",   emoji: "🌙" },
      { label: "Pitch Up",       value: "filter_pitch",   emoji: "⬆️" },
      { label: "Lofi",           value: "filter_lofi",    emoji: "📻" },
      { label: "Distortion",     value: "filter_distort", emoji: "💥" },
      { label: "Speed",          value: "filter_speed",   emoji: "⚡" },
      { label: "Vaporwave",      value: "filter_vapor",   emoji: "🌊" },
    ])
  );
}

/* ══════════════════════════════════════════════════════
 *  Setup Panel — Update in-place with track info
 * ══════════════════════════════════════════════════════ */

async function updateSetupPanel(client, player, track, setupData) {
  const C = client.components;
  const e = client.emoji;
  const channel = client.channels.cache.get(setupData.Channel);
  if (!channel) return;

  const title = cleanTitle(track.title);
  const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;
  const requester = track.requester?.username || "Autoplay";
  const endsAt = Math.round((Date.now() + (track.length || 0)) / 1000);
  const queueSize = player.queue.size;

  const loopLabels = { none: "Off", track: "Track", queue: "Queue" };
  const loopMode = loopLabels[player.loop || "none"] || "Off";
  const autoplay = player.data?.get("autoplay") ? "On" : "Off";

  const body =
    `**Now Playing**\n` +
    `**${title}**\nby **${track.author}**\n\n` +
    `${e.dot} Ends <t:${endsAt}:R> · \`${convertTime(track.length)}\`\n` +
    `${e.dot} Requested by **${requester}**\n` +
    `${e.dot} Queue: \`${queueSize}\` · Loop: \`${loopMode}\` · Autoplay: \`${autoplay}\``;

  const voiceCh = client.channels.cache.get(setupData.voiceChannel || player.voiceId);
  const voiceName = voiceCh?.name || "Voice";

  const container = C.container(COLORS.brand)
    .addTextDisplayComponents(C.text(`### ${MARK}  Aevix Music`))
    .addSeparatorComponents(C.separator());

  if (thumb) {
    container.addSectionComponents(C.section(body, thumb));
  } else {
    container.addTextDisplayComponents(C.text(body));
  }

  container
    .addSeparatorComponents(C.separator())
    .addActionRowComponents(
      C.row(
        C.btn.secondary("setup_pause", null, "⏸️"),
        C.btn.secondary("setup_skip", null, "⏭️"),
        C.btn.danger("setup_stop", null, "⏹️"),
        C.btn.secondary("setup_loop", null, "🔁"),
        C.btn.secondary("setup_shuffle", null, "🔀"),
      )
    )
    .addSeparatorComponents(C.separator())
    .addTextDisplayComponents(
      C.text(`-# ${MARK} 🔊 ${voiceName} · Type a song name to add to queue`)
    );

  try {
    const msg = await channel.messages.fetch(setupData.Message).catch(() => null);
    if (msg) await msg.edit(C.v2(container));
  } catch {}
}

/* ── Canvas Card NP (Presets 1–3) ────────────────── */

async function sendCardNP(client, channel, track, presetType, filterMenu, buttonRow) {
  const title = cleanTitle(track.title);
  const auth = track.author;
  const total = track.length;
  const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || client.user.displayAvatarURL({ size: 512 });
  const duration = moment.duration(total).format("hh:mm:ss");

  let buf = null;
  try {
    if (presetType === 1 && musicCard) {
      buf = await new musicCard().setName(title).setAuthor(auth).setColor("auto")
        .setTheme("quartz+").setBrightness(50).setThumbnail(thumb)
        .setProgress(0).setStartTime("0:00").setEndTime(duration).build();
    } else if (presetType === 2 && Classic) {
      buf = await Classic({
        thumbnailImage: thumb, backgroundColor: "#070707", progress: 0,
        progressColor: "#FF7A00", progressBarColor: "#5F2D00", name: title,
        nameColor: "#FF7A00", author: `By ${auth}`, authorColor: "#696969",
        startTime: "0:00", endTime: duration, timeColor: "#FF7A00",
      });
    } else if (presetType === 3 && canvafy) {
      buf = await new canvafy.Spotify().setAuthor(auth).setTimestamp(1000, total)
        .setImage(thumb).setTitle(title).setBlur(1).setOverlayOpacity(0.5).build();
    }
  } catch {}

  if (buf) {
    return channel.send({
      embeds: [new EmbedBuilder().setImage("attachment://nowplaying.png").setColor(COLORS.base)],
      files: [new AttachmentBuilder(buf, { name: "nowplaying.png" })],
      components: [filterMenu, buttonRow],
    });
  }
  return null;
}

/* ── Components V2 NP (Premium) ──────────────────── */

function sendComponentsNP(client, channel, track, filterMenu, buttonRow) {
  const C = client.components;
  const e = client.emoji;
  const title = cleanTitle(track.title);
  const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;
  const requester = track.requester?.username || "Autoplay";
  const endsAt = Math.round((Date.now() + (track.length || 0)) / 1000);

  const body =
    `**${title}**\n` +
    `by **${track.author}**\n\n` +
    `${e.dot} Ends <t:${endsAt}:R>\n` +
    `${e.dot} Requested by **${requester}**`;

  const container = C.container(COLORS.brand)
    .addTextDisplayComponents(C.text(`### ${MARK}  Now Playing`))
    .addSeparatorComponents(C.separator());

  if (thumb) {
    container.addSectionComponents(C.section(body, thumb));
  } else {
    container.addTextDisplayComponents(C.text(body));
  }

  container
    .addSeparatorComponents(C.separator())
    .addActionRowComponents(filterMenu)
    .addActionRowComponents(buttonRow)
    .addSeparatorComponents(C.separator())
    .addTextDisplayComponents(C.text(FOOTER));

  return channel.send(C.v2(container));
}

/* ══════════════════════════════════════════════════════
 *  Main Handler
 * ══════════════════════════════════════════════════════ */

module.exports = {
  name: "playerStart",
  run: async (client, player, track) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;
    if (!player.data) player.data = new Map();

    /* ── Track history ───────────────────────────── */
    player.data.set("lastTrack", track);
    addToHistory(player, track);
    if (client.voiceHealthMonitor) client.voiceHealthMonitor.updateActivity(player.guildId);

    /* ── Webhook log ─────────────────────────────── */
    try {
      new WebhookClient({ url: player_create }).send({
        embeds: [new EmbedBuilder().setColor(client.color)
          .setAuthor({ name: "Player Started", iconURL: client.user.displayAvatarURL() })
          .setDescription(`**Server:** ${guild.name}\n**Track:** ${track.title}\n**By:** ${track.requester?.tag || "Autoplay"}`)
          .setTimestamp()],
      }).catch(() => null);
    } catch {}

    /* ── Check for Setup Channel ─────────────────── */
    const setupData = await Setup.findOne({ Guild: player.guildId });
    const isSetupChannel = setupData && player.textId === setupData.Channel;

    if (isSetupChannel) {
      /* ── SETUP MODE: Update panel in-place ─────── */
      player.data.set("isSetup", true);
      await updateSetupPanel(client, player, track, setupData);

      /* VC Status */
      const vcStatusDoc = await VcStatus.findOne({ guildId: guild.id });
      if (vcStatusDoc) {
        client.rest.put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: `${track.title.substring(0, 25)}` },
        }).catch(() => null);
      }

      /* No NP message, no collector — setup buttons handle everything */
      return;
    }

    /* ── NORMAL MODE: Full NP card ───────────────── */
    player.data.set("isSetup", false);

    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;

    const [vcStatusDoc, presetDoc] = await Promise.all([
      VcStatus.findOne({ guildId: guild.id }),
      Presets.findOne({ guildId: guild.id }),
    ]);

    // Force default to 3 (Canvafy Premium UI) for the Ultimate UI Overhaul
    const presetType = presetDoc?.presetType || 3;
    const buttonRow = createButtonRow(false);
    const filterMenu = createFilterMenu();

    let npMessage = null;
    if (presetType >= 1 && presetType <= 3) {
      npMessage = await sendCardNP(client, channel, track, presetType, filterMenu, buttonRow);
    }
    if (!npMessage) {
      npMessage = await sendComponentsNP(client, channel, track, filterMenu, buttonRow);
    }
    if (!npMessage) return;

    player.data.set("message", npMessage);
    player.data.set("nowPlayingMessage", npMessage);

    /* ── VC Status ───────────────────────────────── */
    if (vcStatusDoc) {
      client.rest.put(`/channels/${player.voiceId}/voice-status`, {
        body: { status: `${track.title.substring(0, 25)}` },
      }).catch(() => null);
    }

    /* ── Collector ───────────────────────────────── */
    const collector = npMessage.createMessageComponentCollector({
      time: Math.min(track.length || 600_000, 3_600_000),
    });
    player.data.set("collector", collector);

    collector.on("collect", async (interaction) => {
      if (interaction.member.voice?.channelId !== player.voiceId) {
        return interaction.reply({
          content: `${MARK} Join the voice channel to use controls.`,
          flags: MessageFlags.Ephemeral,
        }).catch(() => null);
      }

      /* ── Buttons ───────────────────────────────── */
      if (interaction.isButton()) {
        switch (interaction.customId) {
          case "pause":
          case "resume": {
            const nowPaused = interaction.customId === "pause";
            player.pause(nowPaused);
            try {
              const preserved = interaction.message.components.slice(0, -1);
              await interaction.update({ components: [...preserved, createButtonRow(nowPaused)] });
            } catch { await interaction.deferUpdate().catch(() => null); }
            break;
          }
          case "skip":
            player.skip();
            await interaction.reply({ content: `${MARK} Skipped`, flags: MessageFlags.Ephemeral }).catch(() => null);
            break;
          case "stop":
            player.queue.clear();
            player.data.delete("autoplay");
            player.setLoop("none");
            await player.shoukaku.stopTrack();
            await interaction.reply({ content: `${MARK} Player stopped`, flags: MessageFlags.Ephemeral }).catch(() => null);
            break;
          case "loop": {
            const modes = ["none", "track", "queue"];
            const labels = { none: "Off", track: "Track", queue: "Queue" };
            const cur = modes.indexOf(player.loop || "none");
            const next = modes[(cur + 1) % modes.length];
            player.setLoop(next);
            await interaction.reply({
              content: `${MARK} Loop: **${labels[next]}**`,
              flags: MessageFlags.Ephemeral,
            }).catch(() => null);
            break;
          }
          case "shuffle":
            player.queue.shuffle();
            await interaction.reply({ content: `${MARK} Queue shuffled`, flags: MessageFlags.Ephemeral }).catch(() => null);
            break;
        }
      }

      /* ── Filter Select ─────────────────────────── */
      if (interaction.isStringSelectMenu() && interaction.customId === "aevix_filters") {
        const selected = interaction.values[0];

        const deferred = await interaction.deferReply({ flags: MessageFlags.Ephemeral }).then(() => true).catch(() => false);
        if (!deferred) return;

        if (!FREE_FILTERS.has(selected)) {
          try {
            if (!(await hasVoted(client, interaction.user.id))) {
              return interaction.editReply({
                content: `${MARK} Filters require a **vote** · [Vote on Top.gg](${client.config.links.topgg}) · unlocks all filters for 12h`,
              }).catch(() => null);
            }
          } catch {}
        }

        const filterPayload = FILTER_MAP[selected];
        if (filterPayload === undefined) {
          return interaction.editReply({ content: `${MARK} Unknown filter.` }).catch(() => null);
        }

        try {
          await player.shoukaku.setFilters(filterPayload);
        } catch {
          return interaction.editReply({ content: `${MARK} Failed to apply filter — try again.` }).catch(() => null);
        }

        const label = FILTER_LABELS[selected] || selected;
        return interaction.editReply({
          content: selected === "filter_clear"
            ? `${MARK} Filters reset`
            : `${MARK} Applied **${label}**`,
        }).catch(() => null);
      }
    });

    collector.on("end", () => player.data.delete("collector"));
  },
};