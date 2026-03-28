/** @format */

const App = {
  user: null,

  async init() {
    if (!document.querySelector(".ambient-bg")) {
      const bg = document.createElement("div");
      bg.className = "ambient-bg";
      document.body.prepend(bg);
    }

    try {
      const data = await API.auth.status();
      App.user = data?.loggedIn ? data.user : null;
    } catch { App.user = null; }

    App.renderNav();

    if (localStorage.getItem("aevix_ambient") === "on") {
      setTimeout(() => window.ambient?.show(), 1000);
    }
  },

  renderNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    const p = window.location.pathname;
    const u = App.user;
    const on = localStorage.getItem("aevix_ambient") === "on";

    nav.innerHTML = `<div class="nav-inner">
      <a href="/" class="nav-brand"><span class="nav-mark">◆</span><span class="nav-brand-text">Aevix</span></a>
      <div class="nav-links" id="nav-links">
        <a href="/" class="nav-link ${p==="/"?"active":""}">Home</a>
        ${u?`<a href="/dashboard" class="nav-link ${p.startsWith("/dashboard")?"active":""}">Dashboard</a>`:""}
        <a href="/status" class="nav-link ${p==="/status"?"active":""}">Status</a>
        <a href="/vote" class="nav-link ${p==="/vote"?"active":""}">Vote</a>
        ${u?`<a href="/profile" class="nav-link ${p==="/profile"?"active":""}">Profile</a>`:""}
        <button class="ambient-toggle ${on?"active":""}" onclick="App.toggleMusic()" title="Background Music">
          <div class="eq-bars"><span></span><span></span><span></span><span></span></div>
          <span class="ambient-toggle-label">Music</span>
        </button>
        ${u?`<div class="nav-user">
          <img src="${u.avatarUrl}" alt="" class="nav-avatar">
          <span class="nav-username">${u.globalName||u.username}</span>
          <a href="/auth/logout" class="btn btn-ghost btn-sm">Logout</a>
        </div>`:`<a href="/auth/login" class="btn btn-brand btn-sm">Login</a>`}
      </div>
      <button class="nav-hamburger" id="nav-hamburger" onclick="App.toggleMobile()">
        <span></span><span></span><span></span>
      </button>
    </div>`;
  },

  toggleMobile() {
    document.getElementById("nav-links")?.classList.toggle("open");
    document.getElementById("nav-hamburger")?.classList.toggle("open");
  },

  toggleMusic() {
    window.ambient?.toggle();
    document.querySelector(".ambient-toggle")?.classList.toggle("active", window.ambient?.visible);
  },

  toast(msg, type = "info", dur = 4000) {
    let c = document.querySelector(".toast-container");
    if (!c) { c = document.createElement("div"); c.className = "toast-container"; document.body.appendChild(c); }
    const icons = { success:"✓", error:"✕", warn:"⚠", info:"◆" };
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type]||"◆"}</span><span>${msg}</span>`;
    c.appendChild(el);
    setTimeout(() => { el.classList.add("toast-out"); setTimeout(() => el.remove(), 250); }, dur);
  },

  formatTime(ms) {
    if (!ms) return "0:00";
    const s = Math.floor((ms/1000)%60), m = Math.floor((ms/60000)%60), h = Math.floor(ms/3600000);
    return h>0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
  },

  formatNumber(n) {
    if (n>=1e6) return (n/1e6).toFixed(1)+"M";
    if (n>=1e3) return (n/1e3).toFixed(1)+"K";
    return String(n||0);
  },

  formatUptime(s) {
    const d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60);
    if (d>0) return `${d}d ${h}h`;
    if (h>0) return `${h}h ${m}m`;
    return `${m}m`;
  },

  requireAuth() {
    if (!App.user) { window.location.href = "/auth/login"; return false; }
    return true;
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
window.App = App;