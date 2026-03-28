/** @format */

/* ══════════════════════════════════════════════════════════════════════
 *  Aevix — Groq AI Client
 *
 *  Key-rotation + retry for reliable AI responses.
 *  Uses the 6 Groq API keys from config.
 * ══════════════════════════════════════════════════════════════════ */

const config = require("../config");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const keys = config.api?.groq || [];
let keyIndex = 0;

function getKey() {
  if (!keys.length) return null;
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

/**
 * Send a chat completion request to Groq.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {Object} [opts]
 * @param {number} [opts.maxTokens=512]
 * @param {number} [opts.temperature=0.7]
 * @param {number} [opts.retries=2]
 * @returns {Promise<string|null>}
 */
async function chat(systemPrompt, userMessage, opts = {}) {
  const { maxTokens = 512, temperature = 0.7, retries = 2 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const key = getKey();
    if (!key) return null;

    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.status === 429) continue; /* Rate limited — try next key */
      if (!res.ok) continue;

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch {
      continue;
    }
  }

  return null;
}

module.exports = { chat };
