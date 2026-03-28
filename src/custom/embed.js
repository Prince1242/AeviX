/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Embed Builder
 *
 *  Fluent shorthand for Discord.js EmbedBuilder.
 *
 *  Usage:
 *    const embed = new client.embed()
 *      .t("Title").d("Description").thumb(avatarURL).f("Powered by Aevix");
 * ══════════════════════════════════════════════════════════════════════ */

const { EmbedBuilder } = require("discord.js");

module.exports = (color) => {
  class AevixEmbed extends EmbedBuilder {
    constructor() {
      super({});
      this.setColor(color);
    }

    /** Set title */
    t = (title) => {
      this.setTitle(title);
      return this;
    };

    /** Set description */
    d = (text) => {
      this.setDescription(text);
      return this;
    };

    /** Set thumbnail */
    thumb = (url) => {
      if (url) this.setThumbnail(url);
      return this;
    };

    /** Set image */
    img = (url) => {
      if (url) this.setImage(url);
      return this;
    };

    /** Set author */
    a = (text, icon) => {
      this.setAuthor({ name: text, iconURL: icon || undefined });
      return this;
    };

    /** Set footer */
    f = (text, icon) => {
      this.setFooter({ text, iconURL: icon || undefined });
      return this;
    };

    /** Override color */
    c = (hex) => {
      this.setColor(hex);
      return this;
    };

    /** Add field */
    field = (name, value, inline = false) => {
      this.addFields({ name, value, inline });
      return this;
    };

    /** Set timestamp (defaults to now) */
    ts = (date) => {
      this.setTimestamp(date || Date.now());
      return this;
    };

    /** Set URL */
    url = (link) => {
      this.setURL(link);
      return this;
    };
  }

  return AevixEmbed;
};