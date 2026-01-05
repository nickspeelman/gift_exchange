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

function setLiveStatus(mode, detailText) {
  const dot = document.getElementById("liveDot");
  const text = document.getElementById("liveText");
  const detail = document.getElementById("liveDetail");

  dot.classList.remove("live", "error");
  text.textContent = mode === "live" ? "Live" : "Reconnecting…";
  detail.textContent = detailText || "";

  if (mode === "live") dot.classList.add("live");
  if (mode === "error") dot.classList.add("error");
}

function setPublicMessage(message) {
  const el = document.getElementById("publicMessage");
  el.textContent = message || "Waiting for game updates…";
  el.classList.remove("pulse");
  // trigger small animation to make changes feel intentional
  void el.offsetWidth; // reflow
  el.classList.add("pulse");
}

function renderSession(gameId, source) {
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
  // Start in "live" but idle; later this will reflect polling state
  setLiveStatus("live", "Idle");

  // 1) Prefer URL
  const fromUrl = getGameIdFromUrl();
  if (fromUrl) {
    localStorage.setItem(STORAGE_KEYS.gameId, fromUrl);
    renderSession(fromUrl, "URL");
    setPublicMessage("Connected. Waiting for the host to start the game…");
    return;
  }

  // 2) Fall back to localStorage
  const fromStorage = localStorage.getItem(STORAGE_KEYS.gameId) || "";
  renderSession(fromStorage, fromStorage ? "localStorage" : "none");

  if (fromStorage) {
    setPublicMessage("Reconnected. Waiting for the host to start the game…");
  } else {
    setPublicMessage("Not connected to a game yet.");
    setLiveStatus("error", "Missing gameId");
  }
}

document.addEventListener("DOMContentLoaded", init);
