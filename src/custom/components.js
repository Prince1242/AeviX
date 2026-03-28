/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Components V2 Builder
 *
 *  Single source of truth for Aevix's premium dark design system.
 *  Fluent API for Discord Components V2. Containers hold text,
 *  sections, galleries, AND action rows (buttons/selects) in a
 *  single visual unit with a colored accent bar.
 *
 *  Usage:
 *    const C = client.components;
 *    await msg.reply(C.v2(C.ok("Done!")));
 *    await msg.reply(C.v2(
 *      C.errorCard("Not found.", { actions: C.row(C.btn.link("Docs", url)) })
 *    ));
 * ══════════════════════════════════════════════════════════════════ */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  ButtonStyle,
} = require("discord.js");

/* ── Brand Tokens ────────────────────────────────── */

const MARK = "◆";
const FOOTER = `-# ${MARK} Aevix`;

const COLORS = {
  brand:   0x6C3AED,
  base:    0x2b2d31,
  success: 0x059669,
  error:   0xDC2626,
  warn:    0xD97706,
  info:    0x6C3AED,
  spotify: 0x1DB954,
  muted:   0x18181B,
};

/* ── V2 Flag (with fallback) ─────────────────────── *
 * MessageFlags.IsComponentsV2 = 1 << 15 = 32768.
 * If the installed discord-api-types doesn't export it,
 * fall back to the raw value so V2 responses never break.
 * ────────────────────────────────────────────────── */
const V2_FLAG =
  typeof MessageFlags.IsComponentsV2 === "number"
    ? MessageFlags.IsComponentsV2
    : 1 << 15;

const EPHEMERAL_FLAG =
  typeof MessageFlags.Ephemeral === "number"
    ? MessageFlags.Ephemeral
    : 1 << 6;

class Components {
  static MARK = MARK;
  static FOOTER = FOOTER;
  static COLORS = COLORS;
  static V2_FLAG = V2_FLAG;
  static EPHEMERAL_FLAG = EPHEMERAL_FLAG;

  /* ═══════════════════════════════════════════════
   *  Core Builders
   * ═══════════════════════════════════════════════ */

  /** Wrap containers into a Components V2 message payload */
  static v2(...components) {
    return { components: components.flat(), flags: V2_FLAG };
  }

  /**
   * Wrap containers into an EPHEMERAL Components V2 payload.
   * Use this for interaction replies that should be ephemeral.
   */
  static v2Ephemeral(...components) {
    return { components: components.flat(), flags: V2_FLAG | EPHEMERAL_FLAG };
  }

  /** Container with accent color */
  static container(color = COLORS.base) {
    return new ContainerBuilder().setAccentColor(color);
  }

  /** Markdown text display */
  static text(content) {
    return new TextDisplayBuilder().setContent(content);
  }

  /** Separator line */
  static separator(divider = true, spacing = SeparatorSpacingSize.Small) {
    return new SeparatorBuilder().setDivider(divider).setSpacing(spacing);
  }

  /** Large separator */
  static largeSeparator(divider = true) {
    return new SeparatorBuilder().setDivider(divider).setSpacing(SeparatorSpacingSize.Large);
  }

  /* ═══════════════════════════════════════════════
   *  Sections & Media
   * ═══════════════════════════════════════════════ */

  /** Text + optional thumbnail accessory */
  static section(content, thumbnailUrl) {
    const s = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
    if (thumbnailUrl) s.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl));
    return s;
  }

  /** Text + button accessory */
  static sectionButton(content, button) {
    return new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
      .setButtonAccessory(button);
  }

  /** Thumbnail component */
  static thumbnail(url) {
    return new ThumbnailBuilder().setURL(url);
  }

  /** Media gallery from URLs */
  static gallery(...urls) {
    const g = new MediaGalleryBuilder();
    for (const url of urls.flat()) g.addItems(new MediaGalleryItemBuilder().setURL(url));
    return g;
  }

  /* ═══════════════════════════════════════════════
   *  Interactive — Rows, Buttons, Selects
   * ═══════════════════════════════════════════════ */

  /** Action row */
  static row(...components) {
    return new ActionRowBuilder().addComponents(...components.flat());
  }

  /** Button factories */
  static btn = {
    primary:   (id, label, emoji, disabled = false) => Components._btn(id, label, emoji, ButtonStyle.Primary, disabled),
    secondary: (id, label, emoji, disabled = false) => Components._btn(id, label, emoji, ButtonStyle.Secondary, disabled),
    success:   (id, label, emoji, disabled = false) => Components._btn(id, label, emoji, ButtonStyle.Success, disabled),
    danger:    (id, label, emoji, disabled = false) => Components._btn(id, label, emoji, ButtonStyle.Danger, disabled),
    link: (label, url, emoji) => {
      const b = new ButtonBuilder().setLabel(label).setURL(url).setStyle(ButtonStyle.Link);
      if (emoji) b.setEmoji(emoji);
      return b;
    },
  };

  /** @private */
  static _btn(customId, label, emoji, style, disabled) {
    const b = new ButtonBuilder().setCustomId(customId).setStyle(style).setDisabled(disabled);
    if (label) b.setLabel(label);
    if (emoji) b.setEmoji(emoji);
    return b;
  }

  /** String select menu */
  static select(customId, placeholder, options, config = {}) {
    const menu = new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder);
    if (config.minValues) menu.setMinValues(config.minValues);
    if (config.maxValues) menu.setMaxValues(config.maxValues);
    for (const opt of options) {
      const o = new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value);
      if (opt.description) o.setDescription(opt.description);
      if (opt.emoji) o.setEmoji(opt.emoji);
      if (opt.default) o.setDefault(true);
      menu.addOptions(o);
    }
    return menu;
  }

  /* ═══════════════════════════════════════════════
   *  Quick Responses — Branded single-element
   * ═══════════════════════════════════════════════ */

  static ok(text) {
    return new ContainerBuilder().setAccentColor(COLORS.success)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${MARK} ${text}`));
  }

  static fail(text) {
    return new ContainerBuilder().setAccentColor(COLORS.error)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${MARK} ${text}`));
  }

  static note(text) {
    return new ContainerBuilder().setAccentColor(COLORS.base)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${MARK} ${text}`));
  }

  static caution(text) {
    return new ContainerBuilder().setAccentColor(COLORS.warn)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${MARK} ${text}`));
  }

  static info(text) {
    return new ContainerBuilder().setAccentColor(COLORS.brand)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${MARK} ${text}`));
  }

  /* ═══════════════════════════════════════════════
   *  Cards — Structured responses
   * ═══════════════════════════════════════════════ */

  /** @private shared card builder */
  static _card(title, body, defaults = {}) {
    const opts = { ...defaults };
    const c = new ContainerBuilder()
      .setAccentColor(opts.color || COLORS.base)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${MARK}  ${title}`))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

    if (opts.thumbnail) {
      c.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(opts.thumbnail))
      );
    } else {
      c.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
    }

    if (opts.footer !== false) {
      c.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(opts.footer || FOOTER));
    }

    if (opts.actions) {
      c.addActionRowComponents(opts.actions);
    }

    return c;
  }

  static infoCard(title, body, opts = {}) {
    return Components._card(title, body, { color: COLORS.brand, ...opts });
  }

  static errorCard(body, opts = {}) {
    return Components._card("Error", body, { color: COLORS.error, ...opts });
  }

  static successCard(body, opts = {}) {
    return Components._card("Success", body, { color: COLORS.success, ...opts });
  }

  static warnCard(body, opts = {}) {
    return Components._card("Warning", body, { color: COLORS.warn, ...opts });
  }

  static loadingCard(body = "Please wait...", opts = {}) {
    return Components._card("Processing", body, { color: COLORS.brand, ...opts });
  }

  static confirmCard(body, yesId, noId, opts = {}) {
    return Components._card("Confirm", body, {
      color: COLORS.warn,
      actions: new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(yesId).setLabel(opts.yesLabel || "Confirm").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(noId).setLabel(opts.noLabel || "Cancel").setStyle(ButtonStyle.Danger),
      ),
      ...opts,
    });
  }
}

module.exports = Components;