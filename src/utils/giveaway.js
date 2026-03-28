/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Giveaway Utilities
 * ══════════════════════════════════════════════════════════════════ */

const Giveaway = require("../schema/giveaway");
const { MARK, FOOTER, COLORS: BRAND_COLORS } = require("../custom/components");

/**
 * Picks unique random winners from entries array
 * @param {string[]} entries
 * @param {number} count
 * @returns {string[]}
 */
function pickWinners(entries, count) {
  if (!entries.length) return [];
  const pool = [...entries];
  const winners = [];
  const needed = Math.min(count, pool.length);

  for (let i = 0; i < needed; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return winners;
}

/**
 * Formats remaining time from ms
 * @param {number} ms
 * @returns {string}
 */
function formatTimeLeft(ms) {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Parses a duration string like 10m, 2h, 1d, 3d12h into ms
 * @param {string} input
 * @returns {number|null}
 */
function parseDuration(input) {
  if (!input) return null;
  let total = 0;
  const matches = input.matchAll(/(\d+)\s*([smhdw])/gi);
  for (const m of matches) {
    const num = parseInt(m[1]);
    const unit = m[2].toLowerCase();
    const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    total += num * (mult[unit] || 0);
  }
  if (total === 0) {
    /* Try single number as minutes */
    const num = parseInt(input);
    if (!isNaN(num) && num > 0) return num * 60000;
    return null;
  }
  return total;
}

/**
 * Builds the weighted entries array with bonus role entries
 * @param {Object} giveaway - DB document
 * @param {import("discord.js").Guild} guild
 * @returns {string[]}
 */
function buildWeightedEntries(giveaway, guild) {
  const entries = [];
  for (const userId of giveaway.entries) {
    let weight = 1;
    if (giveaway.bonusEntries?.length) {
      const member = guild.members.cache.get(userId);
      if (member) {
        for (const bonus of giveaway.bonusEntries) {
          if (member.roles.cache.has(bonus.roleId)) weight += bonus.entries;
        }
      }
    }
    for (let i = 0; i < weight; i++) entries.push(userId);
  }
  return entries;
}

/**
 * Ends a giveaway and picks winners
 * @param {import("discord.js").Client} client
 * @param {Object} giveaway - DB document
 * @returns {Promise<string[]>} winner IDs
 */
async function endGiveaway(client, giveaway) {
  const guild = client.guilds.cache.get(giveaway.guildId);
  if (!guild) return [];

  const channel = guild.channels.cache.get(giveaway.channelId);
  if (!channel) return [];

  const C = client.components;
  const e = client.emoji;

  const weighted = buildWeightedEntries(giveaway, guild);
  const winnerIds = pickWinners(weighted, giveaway.winners);

  giveaway.ended = true;
  giveaway.winnerIds = [...new Set(winnerIds)];
  await giveaway.save();

  /* Update giveaway message */
  try {
    const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (msg) {
      const winnersText = winnerIds.length
        ? winnerIds.map((id) => `<@${id}>`).join(", ")
        : "No valid entries";

      const container = C.container(BRAND_COLORS.success)
        .addTextDisplayComponents(C.text(`### ${MARK}  Giveaway Ended`))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(
          `**${giveaway.prize}**\n\n` +
          `${e.dot} **Winner(s):** ${winnersText}\n` +
          `${e.dot} **Entries:** \`${giveaway.entries.length}\`\n` +
          `${e.dot} **Hosted by:** <@${giveaway.hostId}>`
        ))
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} Giveaway has ended ${e.dot} Aevix`));

      await msg.edit({ ...C.v2(container), components: [] });
    }
  } catch {}

  /* Announce winners */
  if (winnerIds.length) {
    const winnersText = winnerIds.map((id) => `<@${id}>`).join(", ");
    await channel.send(
      `🎉 Congratulations ${winnersText}! You won **${giveaway.prize}**!\n-# Hosted by <@${giveaway.hostId}>`
    ).catch(() => null);
  } else {
    await channel.send(`${MARK} Giveaway for **${giveaway.prize}** ended with no valid entries.`).catch(() => null);
  }

  return winnerIds;
}

module.exports = { pickWinners, formatTimeLeft, parseDuration, buildWeightedEntries, endGiveaway };