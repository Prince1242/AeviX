/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — /profile
 *  View and manage user profiles with bio and social links.
 * ══════════════════════════════════════════════════════════════════ */

const { ApplicationCommandOptionType } = require("discord.js");
const Profile = require("../../schema/profile");
const Components = require("../../custom/components");

const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "profile",
  description: "View and manage user profiles",
  options: [
    {
      name: "view",
      description: "View a user's profile",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "User to view (defaults to you)",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: "bio",
      description: "Set your profile bio",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "text",
          description: "Your bio (max 250 characters, use 'clear' to remove)",
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 250,
        },
      ],
    },
    {
      name: "social",
      description: "Set a social media link on your profile",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "platform",
          description: "Social platform",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Twitter / X", value: "twitter" },
            { name: "Instagram", value: "instagram" },
            { name: "Discord", value: "discord" },
          ],
        },
        {
          name: "username",
          description: "Your username on that platform (use 'clear' to remove)",
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 100,
        },
        {
          name: "link",
          description: "Direct profile URL (optional)",
          type: ApplicationCommandOptionType.String,
          required: false,
          max_length: 200,
        },
      ],
    },
    {
      name: "reset",
      description: "Reset your entire profile",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],

  run: async (client, interaction) => {
    const C = client.components;
    const e = client.emoji;
    const sub = interaction.options.getSubcommand();

    /* ═══════════════════════════════════════════════
     *  VIEW
     * ═══════════════════════════════════════════════ */
    if (sub === "view") {
      const targetUser = interaction.options.getUser("user") || interaction.user;
      const member = interaction.guild.members.cache.get(targetUser.id)
        || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      const profile = await Profile.findOne({ User: targetUser.id });

      const bio = profile?.Bio || "*No bio set*";

      /* ── Social links ──────────────────────────── */
      const socials = profile?.SocialMedia || {};
      const socialLines = [];

      const platformIcons = {
        twitter: "𝕏",
        instagram: "📷",
        discord: "💬",
      };
      const platformLabels = {
        twitter: "Twitter / X",
        instagram: "Instagram",
        discord: "Discord",
      };

      for (const [platform, data] of Object.entries(socials)) {
        if (data?.username) {
          const icon = platformIcons[platform] || "🔗";
          const label = platformLabels[platform] || platform;
          const display = data.link
            ? `[${data.username}](${data.link})`
            : `\`${data.username}\``;
          socialLines.push(`${icon} **${label}** · ${display}`);
        }
      }

      const socialText = socialLines.length
        ? socialLines.join("\n")
        : "-# No social links configured";

      /* ── Account info ──────────────────────────── */
      const createdTs = Math.round(targetUser.createdTimestamp / 1000);
      const joinedTs = member ? Math.round(member.joinedTimestamp / 1000) : null;

      const infoLines = [
        `${e.dot} **Account Created** · <t:${createdTs}:R>`,
      ];
      if (joinedTs)
        infoLines.push(`${e.dot} **Server Joined** · <t:${joinedTs}:R>`);
      if (member?.premiumSince) {
        const boostTs = Math.round(member.premiumSinceTimestamp / 1000);
        infoLines.push(`${e.dot} **Boosting Since** · <t:${boostTs}:R>`);
      }

      const container = C.container(COLORS.brand)
        .addTextDisplayComponents(C.text(`### ${MARK}  ${targetUser.displayName}'s Profile`))
        .addSeparatorComponents(C.separator())
        .addSectionComponents(
          C.section(
            `${bio}\n\n**Social**\n${socialText}`,
            targetUser.displayAvatarURL({ size: 256 })
          )
        )
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(infoLines.join("\n")))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(FOOTER));

      return interaction.reply(C.v2(container));
    }

    /* ═══════════════════════════════════════════════
     *  BIO
     * ═══════════════════════════════════════════════ */
    if (sub === "bio") {
      const text = interaction.options.getString("text");
      const userId = interaction.user.id;

      if (text.toLowerCase() === "clear") {
        await Profile.findOneAndUpdate(
          { User: userId },
          { $set: { Bio: "" } },
          { upsert: true }
        );
        return interaction.reply(C.v2(C.ok("Your bio has been **cleared**.")));
      }

      await Profile.findOneAndUpdate(
        { User: userId },
        { $set: { Bio: text } },
        { upsert: true }
      );

      return interaction.reply(C.v2(
        C.ok(`Bio updated!\n> ${text}`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  SOCIAL
     * ═══════════════════════════════════════════════ */
    if (sub === "social") {
      const platform = interaction.options.getString("platform");
      const username = interaction.options.getString("username");
      const link = interaction.options.getString("link") || "";
      const userId = interaction.user.id;

      const platformLabels = {
        twitter: "Twitter / X",
        instagram: "Instagram",
        discord: "Discord",
      };

      if (username.toLowerCase() === "clear") {
        await Profile.findOneAndUpdate(
          { User: userId },
          {
            $set: {
              [`SocialMedia.${platform}.username`]: "",
              [`SocialMedia.${platform}.link`]: "",
            },
          },
          { upsert: true }
        );
        return interaction.reply(C.v2(
          C.ok(`**${platformLabels[platform]}** has been removed from your profile.`)
        ));
      }

      /* ── Validate link if provided ─────────────── */
      if (link && !link.match(/^https?:\/\//i)) {
        return interaction.reply(C.v2(
          C.fail("Link must start with `https://` or `http://`.")
        ));
      }

      await Profile.findOneAndUpdate(
        { User: userId },
        {
          $set: {
            [`SocialMedia.${platform}.username`]: username,
            [`SocialMedia.${platform}.link`]: link,
          },
        },
        { upsert: true }
      );

      const display = link ? `[${username}](${link})` : `\`${username}\``;

      return interaction.reply(C.v2(
        C.ok(`**${platformLabels[platform]}** updated to ${display}`)
      ));
    }

    /* ═══════════════════════════════════════════════
     *  RESET
     * ═══════════════════════════════════════════════ */
    if (sub === "reset") {
      const deleted = await Profile.deleteOne({ User: interaction.user.id });

      return interaction.reply(C.v2(
        deleted.deletedCount
          ? C.ok("Your profile has been **reset**. Bio and social links have been cleared.")
          : C.caution("You don't have a profile to reset.")
      ));
    }
  },
};