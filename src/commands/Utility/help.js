/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — help (prefix)
 *  Interactive module browser with search, category pages,
 *  and per-command detail view.
 * ══════════════════════════════════════════════════════════════════ */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

/* ── Build module map from loaded commands ────────── */
function buildModules(client) {
  const map = new Map();

  for (const [, cmd] of client.commands) {
    const cat = cmd.category || "Uncategorized";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(cmd);
  }

  return map;
}

const MODULE_META = {
  Music:        { emoji: "🎵", desc: "High-quality playback and audio controls" },
  Moderation:   { emoji: "🛡️", desc: "Server management and user discipline" },
  Fun:          { emoji: "🎮", desc: "Entertainment and mini-games" },
  AI:           { emoji: "🤖", desc: "AI-powered tools by Groq" },
  Community:    { emoji: "🎪", desc: "Social and engagement tools" },
  Information:  { emoji: "ℹ️", desc: "Lookup, data, and real-time info" },
  Giveaway:     { emoji: "🎁", desc: "Create and manage giveaways" },
  Utility:      { emoji: "🔧", desc: "Stats, info, and bot tools" },
  Config:       { emoji: "⚙️", desc: "Server configuration and setup" },
  Owner:        { emoji: "👑", desc: "Bot owner management tools" },
  Uncategorized:{ emoji: "📦", desc: "Other commands" },
};

module.exports = {
  name: "help",
  aliases: ["h", "commands", "cmds"],
  category: "Utility",
  description: "Browse commands and modules",
  usage: "[command name]",
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    const modules = buildModules(client);

    /* ═══════════════════════════════════════════════
     *  Specific command lookup
     * ═══════════════════════════════════════════════ */
    if (args.length) {
      const name = args[0].toLowerCase();
      const cmd =
        client.commands.get(name) ||
        client.commands.get(client.aliases.get(name));

      if (!cmd) {
        /* Fuzzy search — find partial matches */
        const matches = [...client.commands.values()]
          .filter((c) => c.name.includes(name) || c.aliases?.some((a) => a.includes(name)))
          .slice(0, 5);

        if (matches.length) {
          const list = matches.map((c) => `\`${prefix}${c.name}\` — ${c.description || "No description"}`).join("\n");
          return message.reply(C.v2(
            C.container(COLORS.brand)
              .addTextDisplayComponents(C.text(`### ${MARK}  Did you mean?`))
              .addSeparatorComponents(C.separator())
              .addTextDisplayComponents(C.text(list))
              .addSeparatorComponents(C.separator())
              .addTextDisplayComponents(C.text(FOOTER))
          ));
        }

        return message.reply(C.v2(C.fail(`No command found for \`${name}\`.`)));
      }

      const lines = [`**${prefix}${cmd.name}**`];
      if (cmd.description) lines.push(cmd.description);
      lines.push("");
      if (cmd.aliases?.length)
        lines.push(`${e.dot} **Aliases** · ${cmd.aliases.map((a) => `\`${prefix}${a}\``).join(", ")}`);
      if (cmd.usage)
        lines.push(`${e.dot} **Usage** · \`${prefix}${cmd.name} ${cmd.usage}\``);
      if (cmd.cooldown)
        lines.push(`${e.dot} **Cooldown** · \`${cmd.cooldown}s\``);
      if (cmd.userPerms)
        lines.push(`${e.dot} **Required** · \`${[].concat(cmd.userPerms).join(", ")}\``);
      if (cmd.botPerms)
        lines.push(`${e.dot} **Bot Needs** · \`${[].concat(cmd.botPerms).join(", ")}\``);
      if (cmd.category)
        lines.push(`${e.dot} **Category** · ${cmd.category}`);
      if (cmd.owner) lines.push(`${e.dot} **Owner Only** · Yes`);
      if (cmd.voteonly) lines.push(`${e.dot} **Vote Required** · Yes`);

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Command Info`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(lines.join("\n")))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return message.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  Interactive Module Browser
     * ═══════════════════════════════════════════════ */
    const uid = message.id;
    const totalCmds = client.commands.size;
    const totalSlash = client.slashCommands.size;

    /* Sorted category list (Owner always last) */
    const categories = [...modules.keys()].sort((a, b) => {
      if (a === "Owner") return 1;
      if (b === "Owner") return -1;
      return a.localeCompare(b);
    });

    function buildSelectMenu(active, disabled = false) {
      const opts = [
        { label: "Overview", value: "overview", emoji: "🏠", description: "Command center" },
        ...categories.map((cat) => ({
          label: cat,
          value: cat,
          emoji: MODULE_META[cat]?.emoji || "📦",
          description: `${modules.get(cat).length} commands`,
          default: cat === active,
        })),
      ];
      const menu = C.select(`help_${uid}`, "Browse a module", opts);
      if (disabled) menu.setDisabled(true);
      return menu;
    }

    function buildOverview(disabled = false) {
      const listing = categories.map((cat) => {
        const meta = MODULE_META[cat] || MODULE_META.Uncategorized;
        const cmds = modules.get(cat);
        return `${meta.emoji} **${cat}** · \`${cmds.length}\` commands\n-# ${meta.desc}`;
      }).join("\n\n");

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  Aevix — Command Center`))
        .addSeparatorComponents(C.separator())
        .addSectionComponents(
          C.section(
            `Hey **${message.author.displayName}**!\n` +
            `Prefix: \`${prefix}\` · Slash: \`/\`\n` +
            `Use \`${prefix}help <command>\` for details.\n\n` +
            `${e.dot} \`${totalCmds}\` prefix commands\n` +
            `${e.dot} \`${totalSlash}\` slash commands`,
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
            C.btn.link("Vote", client.config.links.topgg, e.premium),
          )
        )
        .addTextDisplayComponents(C.text(`-# ${MARK} Aevix · ${totalCmds + totalSlash} commands`));

      return C.v2(container);
    }

    function buildModule(cat, disabled = false) {
      const cmds = modules.get(cat);
      if (!cmds) return buildOverview(disabled);
      const meta = MODULE_META[cat] || MODULE_META.Uncategorized;

      /* Group commands into rows of 4 for clean display */
      const cmdList = cmds
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => {
          const aliases = c.aliases?.length ? ` (${c.aliases.map((a) => `\`${a}\``).join(", ")})` : "";
          return `\`${prefix}${c.name}\`${aliases}\n-# ${c.description || "No description"}`;
        })
        .join("\n\n");

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${meta.emoji}  ${cat} Commands`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`${meta.desc}\n\n${cmdList}`))
        .addSeparatorComponents(C.separator())
        .addActionRowComponents(C.row(buildSelectMenu(cat, disabled)))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(
          C.text(`-# ${MARK} ${cmds.length} commands in ${cat} · ${prefix}help <command> for details`)
        );

      return C.v2(container);
    }

    /* ── Send & Collect ──────────────────────────── */
    const msg = await message.reply(buildOverview());
    let currentView = "overview";

    const collector = msg.createMessageComponentCollector({
      time: 120_000,
      filter: (i) => i.user.id === message.author.id && i.customId === `help_${uid}`,
    });

    collector.on("collect", async (i) => {
      currentView = i.values[0];
      const page = currentView === "overview" ? buildOverview() : buildModule(currentView);
      await i.update(page).catch(() => null);
    });

    collector.on("end", async () => {
      const page = currentView === "overview" ? buildOverview(true) : buildModule(currentView, true);
      await msg.edit(page).catch(() => null);
    });
  },
};