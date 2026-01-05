// player/js/app.js

const STORAGE_KEYS = {
  gameId: "we_game_id"
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function getGameIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get("gameId");
  return gameId ? gameId.trim() : "";
}

function render(gameId, source) {
  const el = document.getElementById("sessionStatus");

  if (!gameId) {
    el.innerHTML = `
      <div><strong>Status:</strong> Not connected</div>
      <div style="margin-top:0.5rem;">
        Open the Player URL from the host page (it includes <span class="mono">?gameId=...</span>).
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div><strong>Status:</strong> Connected</div>
    <div class="kv" style="margin-top:0.5rem;">
      <div><strong>Game ID</strong></div>
      <div class="mono">${escapeHtml(gameId)}</div>
      <div><strong>Source</strong></div>
      <div>${escapeHtml(source)}</div>
    </div>
  `;
}

function init() {
  // 1) Prefer URL
  const fromUrl = getGameIdFromUrl();
  if (fromUrl) {
    localStorage.setItem(STORAGE_KEYS.gameId, fromUrl);
    render(fromUrl, "URL");
    return;
  }

  // 2) Fall back to localStorage
  const fromStorage = localStorage.getItem(STORAGE_KEYS.gameId) || "";
  render(fromStorage, fromStorage ? "localStorage" : "none");
}

document.addEventListener("DOMContentLoaded", init);
