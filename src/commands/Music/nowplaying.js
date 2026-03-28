/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — nowplaying (prefix)
 *
 *  Advanced now-playing card with progress bar, status info,
 *  and interactive control buttons.
 * ══════════════════════════════════════════════════════════════════ */

const { convertTime } = require("../../utils/convert");
const { progressbar } = require("../../utils/playerUtils");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "nowplaying",
  aliases: ["np", "now", "playing"],
  category: "Music",
  description: "Show the currently playing track with controls",
  cooldown: 3,
  player: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const player = client.manager.players.get(message.guildId);
    const track = player.queue.current;

    if (!track)
      return message.reply(C.v2(C.fail("Nothing is currently playing.")));

    const position = player.shoukaku?.position || 0;
    const total = track.length || 0;
    const bar = progressbar(player, { size: 18 });
    const thumb = track.thumbnail?.replace("hqdefault", "maxresdefault") || null;
    const requester = track.requester?.username || "Autoplay";

    const loopLabels = { none: "Off", track: "🔂 Track", queue: "🔁 Queue" };
    const loopMode = loopLabels[player.loop || "none"] || "Off";
    const autoplay = player.data?.get("autoplay") ? "On" : "Off";
    const volume = player.volume ?? 80;
    const paused = player.paused;
    const queueSize = player.queue.size;

    /* ── Volume bar ──────────────────────────────── */
    const volBlocks = Math.round(volume / 10);
    const volBar = "█".repeat(volBlocks) + "░".repeat(10 - volBlocks);
    const volIcon = volume === 0 ? "🔇" : volume < 50 ? "🔈" : "🔊";

    const body =
      `**${track.title}**\nby **${track.author}**\n\n` +
      `\`${convertTime(position)}\` ${bar} \`${track.isStream ? "🔴 LIVE" : convertTime(total)}\`\n\n` +
      `${e.dot} **Status** · ${paused ? "⏸️ Paused" : "▶️ Playing"}\n` +
      `${e.dot} **Volume** · ${volIcon} \`${volBar}\` \`${volume}%\`\n` +
      `${e.dot} **Loop** · ${loopMode}\n` +
      `${e.dot} **Autoplay** · \`${autoplay}\`\n` +
      `${e.dot} **Requested by** · ${requester}\n` +
      `${e.dot} **Queue** · \`${queueSize}\` track${queueSize !== 1 ? "s" : ""} remaining`;

    const uid = message.id;

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${e.music}  Now Playing`))
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
          C.btn.secondary(`np_pause_${uid}`, paused ? "Resume" : "Pause", paused ? e.play : e.pause),
          C.btn.secondary(`np_skip_${uid}`, "Skip", e.skip),
          C.btn.danger(`np_stop_${uid}`, "Stop", e.stop),
          C.btn.secondary(`np_loop_${uid}`, "Loop", e.loop),
          C.btn.secondary(`np_shuffle_${uid}`, "Shuffle", e.shuffle),
        )
      );

    if (track.uri) {
      container.addActionRowComponents(
        C.row(C.btn.link("Open Source", track.uri))
      );
    }

    container
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Music`));

    const msg = await message.reply(C.v2(container));

    /* ── Button collector ────────────────────────── */
    const collector = msg.createMessageComponentCollector({
      time: 120_000,
      filter: (i) => i.customId.endsWith(uid),
    });

    collector.on("collect", async (i) => {
      const currentPlayer = client.manager.players.get(message.guildId);
      if (!currentPlayer || !currentPlayer.queue.current) {
        return i.reply(C.v2Ephemeral(C.fail("No active player."))).catch(() => null);
      }

      if (!i.member.voice?.channelId || i.member.voice.channelId !== currentPlayer.voiceId) {
        return i.reply(C.v2Ephemeral(C.fail(`Join <#${currentPlayer.voiceId}> to use controls.`))).catch(() => null);
      }

      const action = i.customId.replace(`_${uid}`, "").replace("np_", "");

      switch (action) {
        case "pause": {
          const isPaused = currentPlayer.paused;
          currentPlayer.pause(!isPaused);
          await i.reply(C.v2Ephemeral(C.ok(isPaused ? "▶️ Resumed" : "⏸️ Paused"))).catch(() => null);
          break;
        }
        case "skip": {
          const t = currentPlayer.queue.current?.title || "track";
          currentPlayer.skip();
          await i.reply(C.v2Ephemeral(C.ok(`⏭️ Skipped **${t}**`))).catch(() => null);
          break;
        }
        case "stop": {
          currentPlayer.queue.clear();
          currentPlayer.data?.delete("autoplay");
          currentPlayer.setLoop("none");
          await currentPlayer.shoukaku.stopTrack();
          await i.reply(C.v2Ephemeral(C.ok("⏹️ Stopped and cleared queue."))).catch(() => null);
          break;
        }
        case "loop": {
          const modes = ["none", "track", "queue"];
          const labels = { none: "Off", track: "🔂 Track", queue: "🔁 Queue" };
          const cur = modes.indexOf(currentPlayer.loop || "none");
          const next = modes[(cur + 1) % modes.length];
          currentPlayer.setLoop(next);
          await i.reply(C.v2Ephemeral(C.ok(`Loop: **${labels[next]}**`))).catch(() => null);
          break;
        }
        case "shuffle": {
          if (currentPlayer.queue.size < 2) {
            return i.reply(C.v2Ephemeral(C.fail("Need at least 2 tracks to shuffle."))).catch(() => null);
          }
          currentPlayer.queue.shuffle();
          await i.reply(C.v2Ephemeral(C.ok(`🔀 Shuffled **${currentPlayer.queue.size}** tracks`))).catch(() => null);
          break;
        }
      }
    });
  },
};
