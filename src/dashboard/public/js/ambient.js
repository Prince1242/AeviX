/** @format */

/* ══════════════════════════════════════════════════
 *  Aevix — Ambient Music Player
 *
 *  Spotify embed widget for NCS / lofi background music.
 *  Toggleable from navbar with persistent preference.
 * ══════════════════════════════════════════════════ */

class AmbientPlayer {
  constructor() {
    this.visible = false;
    this.container = null;
    this.playlists = [
      { id: "0vvXsWCC9xrXsKd4FyS8kM", label: "NCS" },
      { id: "37i9dQZF1DWWQRwui0ExPn", label: "Lofi Beats" },
      { id: "37i9dQZF1DX4WYpdgoIcn6", label: "Chill Hits" },
      { id: "37i9dQZF1DX0SM0LYsmbMT", label: "Chill Vibes" },
    ];
    this.currentIdx = parseInt(localStorage.getItem("aevix_playlist") || "0") || 0;
  }

  init() {
    if (this.container) return;

    this.container = document.createElement("div");
    this.container.id = "ambient-player";
    this.container.innerHTML = `
      <div class="ambient-bar">
        <div class="ambient-bar-inner">
          <div class="ambient-label">
            <div class="ambient-eq"><span></span><span></span><span></span><span></span></div>
            <span>◆ Now Vibing</span>
          </div>
          <div class="ambient-pills">
            ${this.playlists.map((p, i) => `<button class="ambient-pill ${i === this.currentIdx ? "active" : ""}" onclick="ambient.switchPlaylist(${i})">${p.label}</button>`).join("")}
          </div>
          <button class="ambient-close" onclick="ambient.hide()">✕</button>
        </div>
        <div class="ambient-embed" id="ambient-embed"></div>
      </div>
    `;
    document.body.appendChild(this.container);
    this._loadEmbed();
  }

  _loadEmbed() {
    const el = document.getElementById("ambient-embed");
    if (!el) return;
    const pl = this.playlists[this.currentIdx];
    el.innerHTML = `<iframe src="https://open.spotify.com/embed/playlist/${pl.id}?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius:12px"></iframe>`;
  }

  show() {
    this.init();
    this.container.classList.add("visible");
    this.visible = true;
    localStorage.setItem("aevix_ambient", "on");
  }

  hide() {
    if (this.container) this.container.classList.remove("visible");
    this.visible = false;
    localStorage.setItem("aevix_ambient", "off");
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  switchPlaylist(idx) {
    this.currentIdx = idx;
    localStorage.setItem("aevix_playlist", idx);
    this._loadEmbed();
    document.querySelectorAll(".ambient-pill").forEach((p, i) => p.classList.toggle("active", i === idx));
  }
}

window.ambient = new AmbientPlayer();