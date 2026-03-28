/** @format */

module.exports = {
  token: "YOUR_BOT_TOKEN_HERE",
  clientId: "1477622882514370631",
  prefix: ">",
  ownerID: "971329961313046578",
  ownerIds: ["971329961313046578"],
  SpotifyID: "YOUR_SPOTIFY_ID",
  SpotifySecret: "YOUR_SPOTIFY_SECRET",
  mongourl: "YOUR_MONGODB_URI_HERE",
  embedColor: "#000000",
  logs: "YOUR_LOG_WEBHOOK_URL",
  node_source: "ytsearch",
  topgg: "YOUR_TOPGG_TOKEN",

  topggWebhook: {
    enabled: false,
    port: 20034,
    auth: "aevix_vote_webhook_secret",
  },

  dashboard: {
    enabled: true,
    port: 20033,
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackUrl: "http://145.239.65.118:20033/auth/callback",
    sessionSecret: "aevix_d4shb0ard_s3ss10n_k3y_pr1nc3_2025_x9Kw",
    baseUrl: "http://145.239.65.118:20033",
  },

  api: {
    tmdb: "YOUR_TMDB_API_KEY",
    youtube: "YOUR_YOUTUBE_API_KEY",
    openweather: "YOUR_OPENWEATHER_API_KEY",
    giphy: "YOUR_GIPHY_API_KEY",
    coingecko: "YOUR_COINGECKO_API_KEY",
    memer: "YOUR_MEMER_API_KEY",
    ksoft: "YOUR_KSOFT_API_KEY",
    yandex: "YOUR_YANDEX_API_KEY",
    groq: [
      "REPLACE_WITH_GROQ_KEY_1",
      "REPLACE_WITH_GROQ_KEY_2"
    ],
    twitter: "YOUR_TWITTER_API_KEY",
  },

  links: {
    BG: "https://cdn.discordapp.com/attachments/1061636453437804544/1186002755924525166/20231217_232106.jpg",
    support: "https://discord.gg/B9sVTSwXER",
    invite: "https://discord.com/oauth2/authorize?client_id=1477622882514370631&permissions=8&integration_type=0&scope=bot",
    power: "Powered by Aevix",
    vanity: "https://discord.gg/B9sVTSwXER",
    guild: "1451498686491394060",
    topgg: "https://top.gg/bot/1477622882514370631/vote",
    dashboard: "http://145.239.65.118:20033",
  },

  Webhooks: {
    black: "YOUR_WEBHOOK_URL",
    player_create: "YOUR_WEBHOOK_URL",
    player_delete: "YOUR_WEBHOOK_URL",
    guild_join: "YOUR_WEBHOOK_URL",
    guild_leave: "YOUR_WEBHOOK_URL",
    cmdrun: "YOUR_WEBHOOK_URL",
  },

  nodes: [
    {
      name: "Node-1",
      url: "pnode.ruthless.qzz.io:80",
      auth: "senna",
      secure: false,
    },
  ],
};
