/** @format */

const Components = require("../../custom/components");
const { MARK, COLORS } = Components;

module.exports = {
  name: "crypto",
  aliases: ["coin", "price", "btc", "eth"],
  category: "Information",
  description: "Check cryptocurrency prices",
  usage: "<coin name or symbol>",
  args: true,
  cooldown: 5,

  async execute(message, args, client, prefix) {
    const C = client.components;
    const e = client.emoji;
    let query = args[0].toLowerCase();

    /* Common shortcuts */
    const shortcuts = { btc: "bitcoin", eth: "ethereum", sol: "solana", doge: "dogecoin", xrp: "ripple", ada: "cardano", bnb: "binancecoin", avax: "avalanche-2", dot: "polkadot", link: "chainlink" };
    query = shortcuts[query] || query;

    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(query)}?localization=false&tickers=false&community_data=false&developer_data=false`,
        {
          headers: client.config.api?.coingecko ? { "x-cg-demo-api-key": client.config.api.coingecko } : {},
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!res.ok) {
        if (res.status === 404) return message.reply(C.v2(C.fail(`Coin **${args[0]}** not found. Try the full name (e.g. \`bitcoin\`).`)));
        return message.reply(C.v2(C.fail("Failed to fetch crypto data.")));
      }

      const data = await res.json();
      const market = data.market_data;
      const price = market.current_price?.usd;
      const change24h = market.price_change_percentage_24h;
      const change7d = market.price_change_percentage_7d;
      const marketCap = market.market_cap?.usd;
      const volume = market.total_volume?.usd;
      const high24h = market.high_24h?.usd;
      const low24h = market.low_24h?.usd;
      const ath = market.ath?.usd;
      const thumb = data.image?.small || null;

      const formatUsd = (n) => {
        if (!n) return "N/A";
        if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
        if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
        if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
        return `$${n.toFixed(n < 1 ? 6 : 2)}`;
      };

      const changeEmoji = (v) => !v ? "➖" : v > 0 ? "📈" : "📉";
      const changeStr = (v) => !v ? "N/A" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
      const color = change24h > 0 ? COLORS.success : change24h < 0 ? COLORS.error : COLORS.brand;

      const body =
        `**${data.name}** (${data.symbol?.toUpperCase()})\n\n` +
        `💰 **$${price < 1 ? price.toFixed(6) : price.toLocaleString("en-US", { maximumFractionDigits: 2 })}** USD\n\n` +
        `${changeEmoji(change24h)} **24h** · ${changeStr(change24h)}\n` +
        `${changeEmoji(change7d)} **7d** · ${changeStr(change7d)}\n\n` +
        `${e.dot} **Market Cap** · ${formatUsd(marketCap)}\n` +
        `${e.dot} **24h Volume** · ${formatUsd(volume)}\n` +
        `${e.dot} **24h High** · ${formatUsd(high24h)}\n` +
        `${e.dot} **24h Low** · ${formatUsd(low24h)}\n` +
        `${e.dot} **ATH** · ${formatUsd(ath)}`;

      const container = C.container(color)
        .addTextDisplayComponents(C.text(`### 📊  Crypto Price`))
        .addSeparatorComponents(C.separator());

      if (thumb) {
        container.addSectionComponents(C.section(body, thumb));
      } else {
        container.addTextDisplayComponents(C.text(body));
      }

      container
        .addSeparatorComponents(C.separator())
        .addTextDisplayComponents(C.text(`-# ${MARK} CoinGecko · Aevix Information`));

      await message.reply(C.v2(container));
    } catch {
      await message.reply(C.v2(C.fail("Failed to fetch crypto data. Try again.")));
    }
  },
};
