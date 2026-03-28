/** @format */

/* ══════════════════════════════════════════════════════════════════════════
 *  Aevix — Logger
 *
 *  Branded console logger with timestamp, color-coded levels, and
 *  consistent formatting across all bot systems.
 * ══════════════════════════════════════════════════════════════════════ */

const moment = require("moment-timezone");

/* ── ANSI Color Codes ────────────────────────────── */
const C = {
  reset:     "\x1b[0m",
  bold:      "\x1b[1m",
  dim:       "\x1b[2m",
  black:     "\x1b[30m",
  red:       "\x1b[31m",
  green:     "\x1b[32m",
  yellow:    "\x1b[33m",
  blue:      "\x1b[34m",
  magenta:   "\x1b[35m",
  cyan:      "\x1b[36m",
  white:     "\x1b[37m",
  bgBlack:   "\x1b[40m",
  bgRed:     "\x1b[41m",
  bgGreen:   "\x1b[42m",
  bgYellow:  "\x1b[43m",
  bgBlue:    "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan:    "\x1b[46m",
  bgWhite:   "\x1b[47m",
};

/* ── Log Type Configurations ─────────────────────── */
const LOG_TYPES = {
  log:   { badge: " LOG ",   badgeBg: C.bgCyan,   badgeText: C.black, timeColor: C.green,  textColor: C.reset },
  ready: { badge: " READY ", badgeBg: C.bgGreen,  badgeText: C.black, timeColor: C.blue,   textColor: C.blue },
  warn:  { badge: " WARN ",  badgeBg: C.bgYellow, badgeText: C.black, timeColor: C.yellow, textColor: C.yellow },
  error: { badge: " ERROR ", badgeBg: C.bgRed,    badgeText: C.black, timeColor: C.red,    textColor: C.red },
  debug: { badge: " DEBUG ", badgeBg: C.bgMagenta,badgeText: C.black, timeColor: C.magenta, textColor: C.dim },
  cmd:   { badge: " CMD ",   badgeBg: C.bgCyan,   badgeText: C.black, timeColor: C.green,  textColor: C.reset },
  event: { badge: " EVENT ", badgeBg: C.bgCyan,   badgeText: C.black, timeColor: C.green,  textColor: C.reset },
  music: { badge: " MUSIC ", badgeBg: C.bgBlue,   badgeText: C.white, timeColor: C.blue,   textColor: C.reset },
  vote:  { badge: " VOTE ",  badgeBg: C.bgMagenta,badgeText: C.white, timeColor: C.magenta, textColor: C.reset },
};

class Logger {
  /**
   * Logs a message with timestamp, colored badge, and content
   * @param {string} content - Message to log
   * @param {"log"|"ready"|"warn"|"error"|"debug"|"cmd"|"event"|"music"|"vote"} [type="log"]
   */
  static log(content, type = "log") {
    const config = LOG_TYPES[type];
    if (!config) {
      console.log(content);
      return;
    }

    const timestamp = moment().tz("Asia/Kolkata").format("hh:mm:ss A");
    const time = `${config.timeColor}[${timestamp}]${C.reset}`;
    const badge = `${config.badgeText}${config.badgeBg}${config.badge}${C.reset}`;
    const text = `${config.textColor}${content}${C.reset}`;

    console.log(`${time} ${badge} ${text}`);
  }
}

module.exports = Logger;