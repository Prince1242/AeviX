/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /help
 *  Premium command center with interactive module browser.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType } = require("discord.js");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

/* ── Module Registry ─────────────────────────────── */

const MODULES = [
  {
    id: "music",
    label: "Music",
    emoji: "🎵",
    desc: "High-quality playback and audio controls",
    commands: [
      ["/play", "Play a song, playlist, or URL"],
      ["/pause", "Pause the current track"],
      ["/resume", "Resume playback"],
      ["/skip", "Skip to the next track"],
      ["/stop", "Stop playback and clear queue"],
      ["/queue", "View the current queue"],
      ["/nowplaying", "Show current track details"],
      ["/volume", "Adjust playback volume"],
      ["/loop", "Toggle loop mode (off / track / queue)"],
      ["/shuffle", "Shuffle the queue"],
      ["/autoplay", "Toggle autoplay mode"],
      ["/seek", "Seek to a position in the track"],
      ["/lyrics", "View synced or plain lyrics"],
      ["/filter", "Apply an audio filter"],
      ["/247", "Toggle 24/7 voice mode"],
      ["/grab", "Save current track to your DMs"],
      ["/replay", "Replay the current track"],
    ],
  },
  {
    id: "moderation",
    label: "Moderation",
    emoji: "🛡️",
    desc: "Server management and user discipline",
    commands: [
      ["/ban", "Ban a member from the server"],
      ["/unban", "Unban a user by ID"],
      ["/kick", "Kick a member from the server"],
      ["/timeout", "Timeout a member"],
      ["/untimeout", "Remove a member's timeout"],
      ["/warn", "Issue a warning to a member"],
      ["/warnings", "View warnings for a user"],
      ["/purge", "Bulk delete messages"],
      ["/lock", "Lock a channel"],
      ["/unlock", "Unlock a channel"],
      ["/slowmode", "Set channel slowmode"],
    ],
  },
  {
    id: "config",
    label: "Config",
    emoji: "⚙️",
    desc: "Server configuration and setup",
    commands: [
      ["/antinuke", "Configure antinuke protection"],
      ["/automod", "Configure automod settings"],
      ["/welcome", "Configure welcome messages"],
      ["/autorole", "Configure auto-assigned roles"],
      ["/prefix", "Set server command prefix"],
      ["/setup", "Setup music request channel"],
    ],
  },
  {
    id: "utility",
    label: "Utility",
    emoji: "🔧",
    desc: "Information, stats, and tools",
    commands: [
      ["/help", "Browse commands and modules"],
      ["/ping", "Check bot latency"],
      ["/botinfo", "View bot statistics"],
      ["/userinfo", "View user information"],
      ["/serverinfo", "View server information"],
      ["/avatar", "View a user's avatar"],
      ["/banner", "View a user's banner"],
      ["/vote", "Vote for Aevix on top.gg"],
      ["/invite", "Get the bot invite link"],
    ],
  },
  {
    id: "community",
    label: "Community",
    emoji: "🎪",
    desc: "Social and engagement tools",
    commands: [
      ["/giveaway", "Manage server giveaways"],
      ["/afk", "Set your AFK status"],
      ["/profile", "View and manage profiles"],
      ["/snipe", "View last deleted message"],
    ],
  },
];

const TOTAL = MODULES.reduce((a, m) => a + m.commands.length, 0);

module.exports = {
  name: "help",
  description: "Browse commands and modules",
  options: [
    {
      name: "command",
      description: "Get info about a specific command",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction, prefix) => {
    const C = client.components;
    const e = client.emoji;
    const query = interaction.options.getString("command");

    /* ── Specific command lookup ──────────────────── */
    if (query) {
      const name = query.replace(/^\//, "").toLowerCase();
      const slash = client.slashCommands.get(name);
      const pfx =
        client.commands.get(name) ||
        client.commands.get(client.aliases.get(name));

      if (!slash && !pfx) {
        return interaction.reply(C.v2(C.fail(`No command found for \`${query}\`.`)));
      }

      const cmd = slash || pfx;
      const isSlash = !!slash;
      const lines = [`**${isSlash ? "/" : prefix}${cmd.name}**`];
      if (cmd.description) lines.push(cmd.description);
      lines.push("");
      if (cmd.aliases?.length)
        lines.push(`${e.dot} **Aliases:** ${cmd.aliases.map((a) => `\`${a}\``).join(", ")}`);
      if (cmd.usage)
        lines.push(`${e.dot} **Usage:** \`${prefix}${cmd.name} ${cmd.usage}\``);
      if (cmd.cooldown)
        lines.push(`${e.dot} **Cooldown:** \`${cmd.cooldown}s\``);
      if (cmd.userPerms)
        lines.push(`${e.dot} **Permissions:** \`${[].concat(cmd.userPerms).join(", ")}\``);
      lines.push(`${e.dot} **Type:** ${isSlash ? "Slash" : "Prefix"} Command`);

      const card = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Command Info`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(lines.join("\n")))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.reply(C.v2(card));
    }

    /* ── Page Builders ───────────────────────────── */
    const uid = interaction.id;

    function buildSelectMenu(active, disabled) {
      const opts = [
        { label: "Overview", value: "overview", emoji: "🏠", description: "Back to command center" },
        ...MODULES.map((m) => ({
          label: m.label,
          value: m.id,
          emoji: m.emoji,
          description: `${m.commands.length} commands`,
          default: m.id === active,
        })),
      ];
      const menu = C.select(`help_${uid}`, "Browse a module", opts);
      if (disabled) menu.setDisabled(true);
      return menu;
    }

    function buildOverview(disabled = false) {
      const listing = MODULES.map(
        (m) => `${m.emoji} **${m.label}** · \`${m.commands.length}\` commands\n-# ${m.desc}`
      ).join("\n\n");

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Aevix — Command Center`))
        .addSeparatorComponents(C.separator())
        .addSectionComponents(
          C.section(
            `Hey **${interaction.user.displayName}**!\n` +
              `Browse modules below or use \`/help <command>\`\n` +
              `Prefix: \`${prefix}\` · Slash: \`/\``,
            client.user.displayAvatarURL({ size: 256 })
          )
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(listing))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(C.row(buildSelectMenu(null, disabled)))
        .addActionRowComponents(
          C.row(
            C.btn.link("Invite", client.config.links.invite),
            C.btn.link("Support", client.config.links.support),
            C.btn.link("Vote", client.config.links.topgg, e.premium)
          )
        )
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix · ${TOTAL} commands`));

      return C.v2(container);
    }

    function buildModule(id, disabled = false) {
      const mod = MODULES.find((m) => m.id === id);
      if (!mod) return buildOverview(disabled);

      const cmdList = mod.commands.map(([n, d]) => `\`${n}\` · ${d}`).join("\n");

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${mod.emoji}  ${mod.label} Commands`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`${mod.desc}\n\n${cmdList}`))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(C.row(buildSelectMenu(id, disabled)))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(
          C.text(`-# ${MARK} Aevix · ${mod.commands.length} commands in ${mod.label}`)
        );

      return C.v2(container);
    }

    /* ── Send & Collect ──────────────────────────── */
    const msg = await interaction.reply({ ...buildOverview(), fetchReply: true });

    let currentView = "overview";

    const collector = msg.createMessageComponentCollector({
      time: 120_000,
      filter: (i) => i.user.id === interaction.user.id && i.customId === `help_${uid}`,
    });

    collector.on("collect", async (i) => {
      currentView = i.values[0];
      const page = currentView === "overview" ? buildOverview() : buildModule(currentView);
      await i.update(page).catch(() => null);
    });

    collector.on("end", async () => {
      const page =
        currentView === "overview" ? buildOverview(true) : buildModule(currentView, true);
      await interaction.editReply(page).catch(() => null);
    });
  },
};