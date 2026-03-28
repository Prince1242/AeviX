/** @format */

const MAX_SNIPES = 1000;
const SNIPE_EXPIRY_MS = 10 * 60 * 1000; /* 10 minutes */

module.exports = {
  name: "messageDelete",
  run: async (client, message) => {
    if (message.partial || !message.guild || message.author?.bot) return;

    if (!client.snipes) client.snipes = new Map();

    client.snipes.set(message.channel.id, {
      content: message.content,
      author: message.author,
      image: message.attachments.first()?.proxyURL || null,
      time: Date.now(),
    });

    /* ── Periodic cleanup: evict stale entries ──── */
    if (client.snipes.size > MAX_SNIPES) {
      const now = Date.now();
      for (const [key, data] of client.snipes) {
        if (now - data.time > SNIPE_EXPIRY_MS) {
          client.snipes.delete(key);
        }
      }
    }
  },
};