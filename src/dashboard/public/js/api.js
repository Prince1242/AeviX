/** @format */

/* ══════════════════════════════════════════════════
 *  Aevix Dashboard — API Client
 * ══════════════════════════════════════════════════ */

const API = {
  async request(url, options = {}) {
    try {
      const res = await fetch(url, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
      });

      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "REAUTH") {
          window.location.href = "/auth/login";
          return null;
        }
        window.location.href = "/auth/login";
        return null;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    } catch (err) {
      throw err;
    }
  },

  get: (url) => API.request(url),
  post: (url, body) => API.request(url, { method: "POST", body: JSON.stringify(body) }),
  put: (url, body) => API.request(url, { method: "PUT", body: JSON.stringify(body) }),
  del: (url, body) => API.request(url, { method: "DELETE", body: JSON.stringify(body) }),

  auth: {
    status: () => API.get("/auth/status"),
  },
  stats: () => API.get("/api/stats"),
  guilds: {
    list: () => API.get("/api/guilds"),
    get: (id) => API.get(`/api/guilds/${id}`),
  },
  config: {
    get: (id) => API.get(`/api/config/${id}`),
    prefix: (id, prefix) => API.put(`/api/config/${id}/prefix`, { prefix }),
    antinuke: (id, data) => API.put(`/api/config/${id}/antinuke`, data),
    automod: (id, data) => API.put(`/api/config/${id}/automod`, data),
    welcome: (id, data) => API.put(`/api/config/${id}/welcome`, data),
    autorole: (id, data) => API.put(`/api/config/${id}/autorole`, data),
    addAR: (id, trigger, response) => API.post(`/api/config/${id}/autoresponder`, { trigger, response }),
    delAR: (id, trigger) => API.del(`/api/config/${id}/autoresponder`, { trigger }),
  },
  music: {
    state: (id) => API.get(`/api/music/${id}`),
    action: (id, action, data) => API.post(`/api/music/${id}`, { action, data }),
    search: (id, query) => API.post(`/api/music/${id}/search`, { query }),
  },
  user: {
    profile: () => API.get("/api/user/profile"),
    updateProfile: (data) => API.put("/api/user/profile", data),
  },
  vote: {
    status: () => API.get("/api/vote/status"),
    stats: () => API.get("/api/vote/stats"),
  },
};

window.API = API;