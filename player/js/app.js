// player/js/app.js

const STORAGE_KEYS = {
  gameId: "we_game_id",
  publicMessage: "we_public_message"
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
  // Start optimistic
  setLiveStatus("live", "Idle");

  // 1) Prefer URL
  const fromUrl = getGameIdFromUrl();
  if (fromUrl) {
    localStorage.setItem(STORAGE_KEYS.gameId, fromUrl);
    renderSession(fromUrl, "URL");
    setPublicMessage("Connected. Waiting for the host to start the game…");
    startPolling(fromUrl);
    return;
  }

  // 2) Fall back to localStorage
  const fromStorage = localStorage.getItem(STORAGE_KEYS.gameId) || "";
  renderSession(fromStorage, fromStorage ? "localStorage" : "none");

  if (fromStorage) {
    setPublicMessage("Reconnected. Waiting for the host to start the game…");
    startPolling(fromStorage);
  } else {
    setPublicMessage("Not connected to a game yet.");
    setLiveStatus("error", "Missing gameId");
  }
}

function readPublicMessageFromStorage() {
  return localStorage.getItem(STORAGE_KEYS.publicMessage) || "";
}

// This is our "backend" for now.
// Later, this will fetch JSON from Apps Script.
async function poll(gameId, ctx) {
  // gameId is unused for localStorage, but we include it now so the signature matches future API polling.
  const msg = readPublicMessageFromStorage();

  const changed = msg !== ctx.lastMessage;
  if (changed) {
    ctx.lastMessage = msg;
  }

  return {
    ok: true,
    changed,
    publicMessage: msg
  };
}

function startPolling(gameId) {
  const ctx = {
    lastMessage: null,
    timerId: null,
    inFlight: false
  };

  // Seed lastMessage so first poll behaves nicely
  ctx.lastMessage = readPublicMessageFromStorage();
  if (ctx.lastMessage) {
    setPublicMessage(ctx.lastMessage);
  }

  async function tick() {
    if (ctx.inFlight) return;
    ctx.inFlight = true;

    try {
      setLiveStatus("live", "Polling");
      const res = await poll(gameId, ctx);

      if (!res.ok) {
        setLiveStatus("error", "Reconnecting…");
        return;
      }

      if (res.changed) {
        setPublicMessage(res.publicMessage || "Waiting for game updates…");
        setLiveStatus("live", "Updated");
        setTimeout(() => setLiveStatus("live", "Idle"), 600);
      } else {
        setLiveStatus("live", "Idle");
      }
    } catch (err) {
      console.error(err);
      setLiveStatus("error", "Reconnecting…");
    } finally {
      ctx.inFlight = false;
    }
  }

  // Start now + repeat
  tick();
  ctx.timerId = setInterval(tick, 1200);
}



document.addEventListener("DOMContentLoaded", init);
