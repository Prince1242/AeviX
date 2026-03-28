/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /afk
 *  Set your AFK status. Mentions and return are handled by
 *  the events/Client/afk.js messageCreate listener.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType } = require("discord.js");
const Afk = require("../../schema/afk");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "afk",
  description: "Set your AFK status",
  options: [
    {
      name: "reason",
      description: "Why you're going AFK",
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 200,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const reason = interaction.options.getString("reason") || "AFK";
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    /* ── Check if already AFK ────────────────────── */
    const existing = await Afk.findOne({ Guild: guildId, Member: userId });
    if (existing) {
      await Afk.deleteOne({ Guild: guildId, Member: userId });

      /* Restore nickname */
      const member = interaction.member;
      if (member.manageable && member.displayName.startsWith("[AFK] ")) {
        await member.setNickname(member.displayName.replace("[AFK] ", "")).catch(() => null);
      }

      return interaction.reply(C.v2(
        C.ok(`Welcome back **${interaction.user.displayName}**! Your AFK has been removed.`)
      ));
    }

    /* ── Set AFK ─────────────────────────────────── */
    await Afk.findOneAndUpdate(
      { Guild: guildId, Member: userId },
      { Guild: guildId, Member: userId, Reason: reason, Time: Date.now() },
      { upsert: true }
    );

    /* Set nickname */
    const member = interaction.member;
    if (member.manageable && !member.displayName.startsWith("[AFK] ")) {
      const newNick = `[AFK] ${member.displayName}`.substring(0, 32);
      await member.setNickname(newNick).catch(() => null);
    }

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  AFK Set`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Status** · ${reason}\n` +
        `${e.dot} **User** · ${interaction.user.displayName}\n\n` +
        `-# I'll notify anyone who mentions you. Send a message to remove your AFK.`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.reply(C.v2(container));
  },
};