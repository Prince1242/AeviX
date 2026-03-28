/** @format */

const { ChannelType } = require("discord.js");
const db247 = require("../../schema/247");
const { sendTemp } = require("../../utils/response");

function clearInactivityTimeout(player) {
  if (!player?.data) return;
  const t = player.data.get("inactivityTimeout");
  if (t) { clearTimeout(t); player.data.delete("inactivityTimeout"); }
}

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    const guildId = newState.guild.id;
    const player = client.manager.players?.get(guildId);
    if (!player) return;

    const C = client.components;
    const botId = client.user.id;
    const botMember = newState.guild.members.cache.get(botId);
    const botVoiceChannel = botMember?.voice.channel;

    /* ── Bot disconnected ────────────────────────── */
    if (!botVoiceChannel || (oldState.channelId && !newState.channelId && oldState.id === botId)) {
      try {
        if (await db247.findOne({ Guild: guildId })) return;
        clearInactivityTimeout(player);
        client.rest.put(`/channels/${player.voiceId}/voice-status`, { body: { status: "" } }).catch(() => null);
        await new Promise((r) => setTimeout(r, 3000));
        const textChannel = client.channels.cache.get(player.textId);
        if (client.voiceHealthMonitor) client.voiceHealthMonitor.stopMonitoring(guildId);
        await player.destroy().catch(() => null);
        if (textChannel) sendTemp(textChannel, C.note("Disconnected"), client, 8_000);
      } catch (e) { client.logger.log(`AutoDestroy: ${e.message}`, "error"); }
      return;
    }

    /* ── Bot moved ───────────────────────────────── */
    if (oldState.id === botId && oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      try {
        player.setVoiceChannel(newState.channelId);
        clearInactivityTimeout(player);
        await db247.findOneAndUpdate({ Guild: guildId }, { VoiceId: newState.channelId }).catch(() => null);
      } catch {}
    }

    /* ── Human joined → cancel timer ─────────────── */
    if (!newState.member.user.bot && newState.channelId === player.voiceId && oldState.channelId !== player.voiceId) {
      clearInactivityTimeout(player);
    }

    /* ── Bot alone check ─────────────────────────── */
    const botVC = newState.guild.channels.cache.get(player.voiceId);
    if (!botVC || botVC.type === ChannelType.GuildText || !botVC.members.has(botId)) return;
    if (botVC.members.filter((m) => !m.user.bot).size > 0) return;

    /* Disable autoplay when alone */
    if (player.data?.get("autoplay")) {
      player.data.set("autoplay", false);
    }

    if (await db247.findOne({ Guild: guildId })) return;

    clearInactivityTimeout(player);
    const timeout = setTimeout(async () => {
      player.data?.delete("inactivityTimeout");
      const active = client.manager.players.get(guildId);
      if (!active) return;
      const vc = newState.guild.channels.cache.get(active.voiceId);
      if (!vc || !vc.members.has(botId) || vc.members.filter((m) => !m.user.bot).size > 0) return;
      if (await db247.findOne({ Guild: guildId })) return;
      const textChannel = client.channels.cache.get(active.textId);
      if (client.voiceHealthMonitor) client.voiceHealthMonitor.stopMonitoring(guildId);
      await active.destroy().catch(() => null);
      if (textChannel) sendTemp(textChannel, C.note("Disconnected — no listeners"), client, 8_000);
    }, 60_000);
    player.data?.set("inactivityTimeout", timeout);
  },
};