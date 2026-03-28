/** @format */

const Components = require("../../custom/components");
const { MARK, FOOTER, COLORS } = Components;

module.exports = {
  name: "avatar",
  aliases: ["av", "pfp"],
  category: "Utility",
  description: "View a user's global or server avatar in full resolution",
  usage: "[@user|id] [server]",
  cooldown: 3,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;

    const showServer = args.some((a) => ["server", "guild", "sv", "-s"].includes(a.toLowerCase()));
    const filtered = args.filter((a) => !["server", "guild", "sv", "-s"].includes(a.toLowerCase()));

    const user = message.mentions.users.first()
      || (filtered[0] ? await client.users.fetch(filtered[0].replace(/[<@!>]/g, "")).catch(() => null) : null)
      || message.author;

    const member = message.guild.members.cache.get(user.id)
      || await message.guild.members.fetch(user.id).catch(() => null);

    const globalUrl = user.displayAvatarURL({ size: 4096 });
    const serverUrl = member?.displayAvatarURL({ size: 4096 });
    const hasServerAvatar = serverUrl && serverUrl !== globalUrl;

    const displayUrl = showServer && hasServerAvatar ? serverUrl : globalUrl;
    const label = showServer && hasServerAvatar ? "Server Avatar" : "Avatar";

    /* ── Build format links ──────────────────────── */
    const formats = ["png", "jpg", "webp"];
    if (displayUrl.includes(".gif") || user.avatar?.startsWith("a_")) formats.push("gif");
    const formatLinks = formats.map((f) => `[\`${f.toUpperCase()}\`](${user.displayAvatarURL({ size: 4096, extension: f })})`).join(" · ");

    const container = C.container(COLORS.brand)
      .addTextDisplayComponents(C.text(`### ${MARK}  ${user.displayName}'s ${label}`))
      .addSeparatorComponents(C.separator())
      .addMediaGalleryComponents(C.gallery(displayUrl))
      .addSeparatorComponents(C.separator())
      .addTextDisplayComponents(C.text(`${e.dot} ${formatLinks}`));

    /* Show toggle button if server avatar exists */
    if (hasServerAvatar) {
      container.addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `-# Use \`${prefix}avatar ${user.id} ${showServer ? "" : "server"}\` to view ${showServer ? "global" : "server"} avatar`
        ));
    }

    container.addSeparatorComponents(C.separator())
      .addActionRowComponents(C.row(C.btn.link("Open in Browser", displayUrl)))
      .addTextDisplayComponents(C.text(FOOTER));

    await message.reply(C.v2(container));
  },
};