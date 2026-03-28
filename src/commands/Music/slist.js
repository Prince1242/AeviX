/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — slist (Spotify Interactive Search)
 *
 *  Searches Spotify and returns a dropdown menu of the top 10 results,
 *  allowing the user to select the exact version to play.
 * ══════════════════════════════════════════════════════════════════ */

const { convertTime } = require("../../utils/convert");
const Components = require("../../custom/components");
const { MessageFlags } = require("discord.js");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "slist",
  aliases: ["ssearch", "spotifylist"],
  category: "Music",
  description: "Interactively search Spotify and pick a track from a dropdown list",
  usage: "<query>",
  args: true,
  cooldown: 5,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const query = args.join(" ");

    /* ── Voice channel permissions ────────────────── */
    const vc = message.member.voice.channel;
    const perms = vc.permissionsFor(message.guild.members.me);
    if (!perms?.has("Connect"))
      return message.reply(C.v2(C.fail("I don't have permission to **join** your voice channel.")));
    if (!perms?.has("Speak"))
      return message.reply(C.v2(C.fail("I don't have permission to **speak** in your voice channel.")));

    const loadMsg = await message.reply(C.v2(
      C.container(COLORS.spotify)
        .addTextDisplayComponents(C.text(`${e.loading} Fetching Spotify results for **${query.length > 60 ? query.slice(0, 60) + "…" : query}**...`))
    ));

    /* ── Setup Search Node ───────────────────────── */
    let player = client.manager.players.get(message.guild.id);
    let createdDummy = false;

    if (!player) {
      try {
        player = await client.manager.createPlayer({
          guildId: message.guildId,
          voiceId: message.member.voice.channelId,
          textId: message.channel.id,
          deaf: true,
          volume: 80,
        });
        createdDummy = true;
      } catch (err) {
        return loadMsg.edit(C.v2(C.fail(`Failed to initialize search node: ${err.message}`)));
      }
    }

    /* ── Search (Forced Spotify Engine) ──────────── */
    let result;
    try {
      result = await player.search(query, { requester: message.author, engine: "spsearch" });
    } catch (err) {
      if (createdDummy) player.destroy();
      return loadMsg.edit(C.v2(C.fail(`Spotify Search failed: ${err.message}`)));
    }

    if (!result?.tracks?.length) {
      if (createdDummy) player.destroy();
      return loadMsg.edit(C.v2(C.fail(`No results found on Spotify for \`${query.substring(0, 80)}\`.`)));
    }

    /* ── Build Dropdown Interactive Results ──────── */
    // Limit to top 10 results
    const tracks = result.tracks.slice(0, 10);
    
    // Store tracks in memory briefly since Discord select menus only pass string values (we'll pass the array index)
    const options = tracks.map((t, idx) => {
      const title = t.title.length > 50 ? t.title.slice(0, 50) + "…" : t.title;
      const author = t.author.length > 40 ? t.author.slice(0, 40) + "…" : t.author;
      return {
        label: title,
        description: `${author} | ${convertTime(t.length)}`,
        value: `sp_sel_${idx}`,
        emoji: "🟢",
      };
    });

    const selectMenu = C.row(
      C.select(`slist_select_${message.id}`, "Select a Spotify track to play...", options)
    );

    const container = C.container(COLORS.spotify)
      .addTextDisplayComponents(C.text(`### 🟢  Spotify Search Results`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`Found **${tracks.length}** matches for \`${query}\`. Select one from the dropdown below to play it.`))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(selectMenu)
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Premium Spotify`));

    // If we loaded a dummy, we strictly shouldn't destroy it here if we want to play the song. We keep it alive.
    // If the user ignores the menu, it might idle and auto-destroy.
    await loadMsg.edit(C.v2(container));

    /* ── Component Collector ──────────────────────── */
    const collector = loadMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id && i.customId === `slist_select_${message.id}`,
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      const idx = parseInt(interaction.values[0].replace("sp_sel_", ""), 10);
      const selectedTrack = tracks[idx];

      if (!selectedTrack) {
        return interaction.reply({ content: `${MARK} Error picking track.`, flags: MessageFlags.Ephemeral }).catch(() => null);
      }

      await interaction.deferUpdate();

      player.queue.add(selectedTrack);
      if (!player.playing && !player.paused) player.play();

      const position = player.queue.size;
      const title = selectedTrack.title.length > 50 ? selectedTrack.title.slice(0, 50) + "…" : selectedTrack.title;
      const thumb = selectedTrack.thumbnail?.replace("hqdefault", "maxresdefault") || null;

      const finishContainer = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${e.addsong}  Added Spotify Track to Queue`))
        .addSeparatorComponents(C.separator());

      const body =
        `**${title}**\nby **${selectedTrack.author}**\n\n` +
        `${e.dot} **Duration** · \`${convertTime(selectedTrack.length)}\`\n` +
        `${e.dot} **Position** · #\`${position}\` in queue\n`;

      if (thumb) {
        finishContainer.addSectionComponents(C.section(body, thumb));
      } else {
        finishContainer.addTextDisplayComponents(C.text(body));
      }

      finishContainer.addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Premium Spotify`));

      await loadMsg.edit(C.v2(finishContainer));
      collector.stop("selected");
    });

    collector.on("end", (collected, reason) => {
      if (reason !== "selected") {
        if (createdDummy && !player.playing && player.queue.size === 0) {
           player.destroy(); // Cleanup idle player
        }
        const timeoutContainer = C.container(COLORS.muted)
          .addTextDisplayComponents(C.text(`${MARK} Search interaction timed out.`));
        loadMsg.edit(C.v2(timeoutContainer)).catch(() => null);
      }
    });

  },
};
