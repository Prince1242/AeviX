/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /timeout
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Components = require("../../custom/components");
const { parseDuration } = require("../../utils/giveaway");
const { formatDuration } = require("../../utils/convert");

const { MARK, FOOTER, COLORS } = Components;
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000; // 28 days

module.exports = {
  name: "timeout",
  description: "Timeout a member",
  botPerms: ["ModerateMembers"],
  userPerms: ["ModerateMembers"],
  default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
  options: [
    {
      name: "user",
      description: "The member to timeout",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "duration",
      description: "Timeout duration (e.g. 10m, 1h, 1d, 7d)",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the timeout",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const user = interaction.options.getUser("user");
    const durationStr = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";

    /* ── Parse duration ──────────────────────────── */
    const ms = parseDuration(durationStr);
    if (!ms || ms < 5000)
      return interaction.reply(C.v2(C.fail("Invalid duration. Use formats like `10m`, `1h`, `2d`.")));
    if (ms > MAX_TIMEOUT_MS)
      return interaction.reply(C.v2(C.fail("Timeout cannot exceed **28 days**.")));

    const member = interaction.guild.members.cache.get(user.id)
      || await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member)
      return interaction.reply(C.v2(C.fail("That user is **not in this server**.")));
    if (user.id === interaction.user.id)
      return interaction.reply(C.v2(C.fail("You cannot timeout yourself.")));
    if (user.id === client.user.id)
      return interaction.reply(C.v2(C.fail("I cannot timeout myself.")));
    if (user.id === interaction.guild.ownerId)
      return interaction.reply(C.v2(C.fail("You cannot timeout the server owner.")));
    if (
      member.roles.highest.position >= interaction.member.roles.highest.position &&
      interaction.user.id !== interaction.guild.ownerId
    )
      return interaction.reply(C.v2(C.fail("That user has a **higher or equal role** than you.")));
    if (!member.moderatable)
      return interaction.reply(C.v2(C.fail("I cannot timeout that user — they have a higher role than me.")));

    await interaction.deferReply();

    /* ── DM notification ─────────────────────────── */
    try {
      const expiresTs = Math.round((Date.now() + ms) / 1000);
      const dm = C.container(COLORS.warn)
        .addTextDisplayComponents(C.text(`### ${MARK}  You've been Timed Out`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `${e.dot} **Server** · ${interaction.guild.name}\n` +
          `${e.dot} **Duration** · ${formatDuration(ms)}\n` +
          `${e.dot} **Expires** · <t:${expiresTs}:R>\n` +
          `${e.dot} **Reason** · ${reason}\n` +
          `${e.dot} **Moderator** · ${interaction.user.displayName}`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));
      await user.send(C.v2(dm)).catch(() => null);
    } catch {}

    /* ── Execute timeout ─────────────────────────── */
    try {
      await member.timeout(ms, `${interaction.user.tag}: ${reason}`);
    } catch (err) {
      return interaction.editReply(C.v2(C.fail(`Failed to timeout: ${err.message}`)));
    }

    const expiresTs = Math.round((Date.now() + ms) / 1000);

    const container = C.container(COLORS.success)
      .addTextDisplayComponents(C.text(`### ${MARK}  Member Timed Out`))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(
        `${e.dot} **Target** · ${user.tag} (\`${user.id}\`)\n` +
        `${e.dot} **Duration** · ${formatDuration(ms)}\n` +
        `${e.dot} **Expires** · <t:${expiresTs}:R>\n` +
        `${e.dot} **Reason** · ${reason}\n` +
        `${e.dot} **Moderator** · ${interaction.user.displayName}`
      ))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(FOOTER));

    await interaction.editReply(C.v2(container));
  },
};