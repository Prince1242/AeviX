/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Interaction Create
 *
 *  Handles slash commands, modals, giveaway buttons, and setup
 *  panel buttons in one unified handler.
 * ══════════════════════════════════════════════════════════════════ */

const { InteractionType, PermissionsBitField } = require("discord.js");
const db = require("../../schema/prefix.js");
const Setup = require("../../schema/setup");
const Giveaway = require("../../schema/giveaway");
const { hasVoted, createVoteGateMessage } = require("../../utils/topgg");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

const MODAL_HANDLERS = new Map();

function registerModalHandlers(client) {
  const modalFiles = [{ id: "bio_modal", path: "../../commands/Profile/bioset" }];
  for (const { id, path } of modalFiles) {
    try { const mod = require(path); if (mod.modalHandler) MODAL_HANDLERS.set(id, mod.modalHandler); } catch {}
  }
  client.registerModal = (customId, handler) => MODAL_HANDLERS.set(customId, handler);
}

function ephError(C, text) {
  return C.v2Ephemeral(C.fail(text));
}

module.exports = {
  name: "interactionCreate",
  run: async (client, interaction) => {
    if (!client._modalsInitialized) { registerModalHandlers(client); client._modalsInitialized = true; }

    const C = client.components;

    /* ══════════════════════════════════════════════
     *  Slash Commands
     * ══════════════════════════════════════════════ */
    if (interaction.type === InteractionType.ApplicationCommand) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;

      if (command.botPerms && !interaction.guild.members.me.permissions.has(PermissionsBitField.resolve(command.botPerms || []))) {
        return interaction.reply(ephError(C, `I need **${command.botPerms}** permission to run \`/${command.name}\`.`));
      }
      if (command.userPerms && !interaction.member.permissions.has(PermissionsBitField.resolve(command.userPerms || []))) {
        return interaction.reply(ephError(C, `You need **${command.userPerms}** permission to run \`/${command.name}\`.`));
      }
      if (command.voteonly && !(await hasVoted(client, interaction.user.id))) {
        const voteMsg = createVoteGateMessage(client);
        return interaction.reply({
          ...voteMsg,
          flags: Components.V2_FLAG | Components.EPHEMERAL_FLAG,
        });
      }
      if (command.player && !client.manager.players.get(interaction.guildId)) {
        return interaction.reply(ephError(C, "No active player. Use `/play` to start one."));
      }
      if (command.inVoiceChannel && !interaction.member.voice.channel) {
        return interaction.reply(ephError(C, "You must be in a **voice channel**."));
      }
      if (command.sameVoiceChannel) {
        const botVC = interaction.guild.members.me?.voice.channel;
        const userVC = interaction.member.voice.channel;
        if (botVC && userVC && userVC.id !== botVC.id) {
          return interaction.reply(ephError(C, `You must be in ${botVC.toString()}.`));
        }
      }

      try {
        let prefix = client.prefix;
        const ress = await db.findOne({ Guild: interaction.guildId });
        if (ress?.Prefix) prefix = ress.Prefix;
        await command.run(client, interaction, prefix);
      } catch (error) {
        client.logger.log(`[Slash] Error in /${command.name}: ${error.message}\n${error.stack}`, "error");
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(C.v2(C.fail("An unexpected error occurred."))).catch(() => null);
        } else {
          await interaction.reply(ephError(C, "An unexpected error occurred.")).catch(() => null);
        }
      }
    }

    /* ══════════════════════════════════════════════
     *  Modal Submissions
     * ══════════════════════════════════════════════ */
    if (interaction.isModalSubmit()) {
      const handler = MODAL_HANDLERS.get(interaction.customId);
      if (handler) {
        try { await handler(interaction, client); }
        catch (e) {
          client.logger.log(`[Modal] Error: ${e.message}`, "error");
          await interaction.reply(ephError(C, "Error processing your input.")).catch(() => null);
        }
      } else {
        for (const [key, fn] of MODAL_HANDLERS) {
          if (interaction.customId.startsWith(key)) {
            try { await fn(interaction, client); } catch {} return;
          }
        }
      }
    }

    /* ══════════════════════════════════════════════
     *  Button Interactions
     * ══════════════════════════════════════════════ */
    if (interaction.isButton()) {
      const customId = interaction.customId;

      /* ── Giveaway Entry Buttons ────────────────── */
      if (customId.startsWith("giveaway_enter_")) {
        return handleGiveawayEntry(client, interaction);
      }

      /* ── Setup Panel Buttons ───────────────────── */
      if (customId.startsWith("setup_")) {
        return handleSetupButtons(client, interaction);
      }

      /* ── Legacy Setup Buttons (fallback) ────────── */
      const setupData = await Setup.findOne({ Guild: interaction.guildId });
      if (setupData && interaction.channelId === setupData.Channel && interaction.message.id === setupData.Message) {
        return handleSetupButtons(client, interaction);
      }
    }
  },
};

/* ══════════════════════════════════════════════════════════════════════
 *  Setup Panel Button Handler
 * ══════════════════════════════════════════════════════════════════ */
async function handleSetupButtons(client, interaction) {
  const C = client.components;
  const player = client.manager.players.get(interaction.guildId);

  if (!player || !player.queue.current) {
    return interaction.reply(
      C.v2Ephemeral(C.fail("No active player. Type a song name to start playing."))
    );
  }

  if (!interaction.member.voice?.channelId) {
    return interaction.reply(
      C.v2Ephemeral(C.fail("Join the voice channel to use controls."))
    );
  }

  if (interaction.member.voice.channelId !== player.voiceId) {
    return interaction.reply(
      C.v2Ephemeral(C.fail(`Join <#${player.voiceId}> to use controls.`))
    );
  }

  /* Normalize button ID (setup_pause → pause, or raw "pause") */
  const action = interaction.customId.replace("setup_", "");

  switch (action) {
    case "pause":
    case "resume": {
      const isPaused = player.paused;
      player.pause(!isPaused);
      return interaction.reply(
        C.v2Ephemeral(C.ok(isPaused ? "▶️ Resumed" : "⏸️ Paused"))
      ).catch(() => null);
    }

    case "skip": {
      const title = player.queue.current?.title || "track";
      player.skip();
      return interaction.reply(
        C.v2Ephemeral(C.ok(`⏭️ Skipped **${title}**`))
      ).catch(() => null);
    }

    case "stop": {
      player.queue.clear();
      player.data?.delete("autoplay");
      player.setLoop("none");
      await player.shoukaku.stopTrack();
      return interaction.reply(
        C.v2Ephemeral(C.ok("⏹️ Stopped playback and cleared queue."))
      ).catch(() => null);
    }

    case "loop": {
      const modes = ["none", "track", "queue"];
      const labels = { none: "Off", track: "🔂 Track", queue: "🔁 Queue" };
      const cur = modes.indexOf(player.loop || "none");
      const next = modes[(cur + 1) % modes.length];
      player.setLoop(next);
      return interaction.reply(
        C.v2Ephemeral(C.ok(`Loop: **${labels[next]}**`))
      ).catch(() => null);
    }

    case "shuffle": {
      if (player.queue.size < 2) {
        return interaction.reply(
          C.v2Ephemeral(C.fail("Need at least 2 tracks in queue to shuffle."))
        ).catch(() => null);
      }
      player.queue.shuffle();
      return interaction.reply(
        C.v2Ephemeral(C.ok(`🔀 Shuffled **${player.queue.size}** tracks`))
      ).catch(() => null);
    }

    default:
      return interaction.deferUpdate().catch(() => null);
  }
}

/* ══════════════════════════════════════════════════════════════════════
 *  Giveaway Entry Button Handler
 * ══════════════════════════════════════════════════════════════════ */
async function handleGiveawayEntry(client, interaction) {
  const C = client.components;
  const e = client.emoji;
  const customId = interaction.customId;
  const messageId = customId.replace("giveaway_enter_", "");

  if (messageId === "pending") {
    return interaction.reply(
      C.v2Ephemeral(C.caution("This giveaway is still being set up. Try again in a moment."))
    );
  }

  try {
    const giveaway = await Giveaway.findOne({
      messageId,
      guildId: interaction.guildId,
      ended: false,
    });

    if (!giveaway) {
      return interaction.reply(
        C.v2Ephemeral(C.fail("This giveaway has **ended** or no longer exists."))
      );
    }

    if (giveaway.requiredRole) {
      if (!interaction.member.roles.cache.has(giveaway.requiredRole)) {
        return interaction.reply(
          C.v2Ephemeral(C.fail(`You need the <@&${giveaway.requiredRole}> role to enter.`))
        );
      }
    }

    const userId = interaction.user.id;

    if (giveaway.entries.includes(userId)) {
      giveaway.entries = giveaway.entries.filter((id) => id !== userId);
      await giveaway.save();
      await updateGiveawayMessage(client, interaction, giveaway);
      return interaction.reply(
        C.v2Ephemeral(C.caution(`You have **left** the giveaway for **${giveaway.prize}**.`))
      );
    }

    giveaway.entries.push(userId);
    await giveaway.save();
    await updateGiveawayMessage(client, interaction, giveaway);

    return interaction.reply(
      C.v2Ephemeral(
        C.ok(
          `You've **entered** the giveaway for **${giveaway.prize}**!\n` +
          `${e.dot} Total entries: \`${giveaway.entries.length}\`\n` +
          `-# Click the button again to leave.`
        )
      )
    );
  } catch (err) {
    client.logger.log(`[Giveaway] Entry error: ${err.message}`, "error");
    return interaction.reply(
      C.v2Ephemeral(C.fail("An error occurred. Please try again."))
    ).catch(() => null);
  }
}

/* ── Update giveaway message entry count ─────────── */
async function updateGiveawayMessage(client, interaction, giveaway) {
  const C = client.components;
  const e = client.emoji;

  try {
    const endsTs = Math.round(giveaway.endsAt.getTime() / 1000);
    const body = [
      `**${giveaway.prize}**\n`,
      `${e.dot} **Ends** · <t:${endsTs}:R> (<t:${endsTs}:f>)`,
      `${e.dot} **Winners** · \`${giveaway.winners}\``,
      `${e.dot} **Hosted by** · <@${giveaway.hostId}>`,
      `${e.dot} **Entries** · \`${giveaway.entries.length}\``,
    ];
    if (giveaway.requiredRole)
      body.push(`${e.dot} **Required Role** · <@&${giveaway.requiredRole}>`);
    body.push(`\n-# Click the button below to enter!`);

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### 🎉  Giveaway`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(body.join("\n")))
      .addSeparatorComponents(C.separator())
      .addActionRowComponents(
        C.row(
          C.btn.success(`giveaway_enter_${giveaway.messageId}`, "Enter Giveaway", "🎉"),
          C.btn.secondary(
            `giveaway_entries_${giveaway.messageId}`,
            `${giveaway.entries.length} entr${giveaway.entries.length === 1 ? "y" : "ies"}`,
            null, true
          )
        )
      )
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`-# ${MARK} Aevix Giveaways`));

    await interaction.message.edit(C.v2(container)).catch(() => null);
  } catch {}
}