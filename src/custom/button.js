/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  DEPRECATED — Use client.components.btn.* instead.
 *
 *  This file exists only for backward compatibility with playerStart.js
 *  and other events that haven't been refactored yet.
 *  Will be deleted when events are updated.
 *
 *  Migration:
 *    OLD: new client.button().s("id", "Label", "🎵")
 *    NEW: C.btn.secondary("id", "Label", "🎵")
 * ══════════════════════════════════════════════════════════════════ */

const { ButtonStyle, ButtonBuilder } = require("discord.js");

module.exports = class AevixButton extends ButtonBuilder {
  _build(customId, label, emoji, style, disabled = false) {
    if (!label && !emoji) throw new Error("AevixButton: Must provide label or emoji.");
    this.setCustomId(customId).setStyle(style).setDisabled(disabled);
    if (label) this.setLabel(label);
    if (emoji) this.setEmoji(emoji);
    return this;
  }

  p = (id, label, emoji, disabled) => this._build(id, label, emoji, ButtonStyle.Primary, disabled);
  s = (id, label, emoji, disabled) => this._build(id, label, emoji, ButtonStyle.Secondary, disabled);
  d = (id, label, emoji, disabled) => this._build(id, label, emoji, ButtonStyle.Danger, disabled);
  success = (id, label, emoji, disabled) => this._build(id, label, emoji, ButtonStyle.Success, disabled);
  fail = (id, label, emoji, disabled) => this._build(id, label, emoji, ButtonStyle.Danger, disabled);

  link = (label, url, emoji) => {
    this.setURL(url).setLabel(label).setStyle(ButtonStyle.Link);
    if (emoji) this.setEmoji(emoji);
    return this;
  };
};