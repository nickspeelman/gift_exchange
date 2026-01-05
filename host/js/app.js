// host/js/app.js

const STORAGE_KEYS = {
  gameId: "we_game_id",
  sessionName: "we_session_name",
  createdAt: "we_created_at",
  publicMessage: "we_public_message",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function base36Random(len = 6) {
  // Not crypto-secure (fine for your stated threat model)
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

function generateGameId() {
  // Example: GE_20260105_143012_X9K2QF
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  const rand = base36Random(6);

  return `GE_${y}${m}${day}_${hh}${mm}${ss}_${rand}`;
}

function defaultSessionName(createdAtIso) {
  const d = new Date(createdAtIso);
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `Gift Exchange ${y}-${m}-${day}`;
}

function getSavedSession() {
  const gameId = localStorage.getItem(STORAGE_KEYS.gameId);
  const sessionName = localStorage.getItem(STORAGE_KEYS.sessionName);
  const createdAt = localStorage.getItem(STORAGE_KEYS.createdAt);
  if (!gameId || !createdAt) return null;
  return { gameId, sessionName, createdAt };
}

function saveSession({ gameId, sessionName, createdAt }) {
  localStorage.setItem(STORAGE_KEYS.gameId, gameId);
  localStorage.setItem(STORAGE_KEYS.sessionName, sessionName);
  localStorage.setItem(STORAGE_KEYS.createdAt, createdAt);
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.gameId);
  localStorage.removeItem(STORAGE_KEYS.sessionName);
  localStorage.removeItem(STORAGE_KEYS.createdAt);
}

function renderSession(session) {
  const result = document.getElementById("result");

  if (!session) {
    result.innerHTML = `<em>No session saved locally.</em>`;
    return;
  }

  result.innerHTML = `
    <div class="kv">
      <div><strong>Game ID</strong></div>
      <div class="mono">${escapeHtml(session.gameId)}
        <button id="copyGameIdBtn" type="button" class="secondary" style="margin-left: 0.5rem;">Copy</button>
      </div>

      <div><strong>Session</strong></div>
      <div>${escapeHtml(session.sessionName || "")}</div>

      <div><strong>Created</strong></div>
      <div class="mono">${escapeHtml(session.createdAt)}</div>

      <div><strong>Player URL</strong></div>
      <div class="mono">
        ${escapeHtml(makePlayerUrl(session.gameId))}
        <button id="copyPlayerUrlBtn" type="button" class="secondary" style="margin-left: 0.5rem;">Copy</button>
      </div>
    </div>
  `;

  // Wire up copy buttons after render
  const copyGameIdBtn = document.getElementById("copyGameIdBtn");
  const copyPlayerUrlBtn = document.getElementById("copyPlayerUrlBtn");

  if (copyGameIdBtn) {
    copyGameIdBtn.addEventListener("click", async () => {
      await copyToClipboard(session.gameId);
      copyGameIdBtn.textContent = "Copied!";
      setTimeout(() => (copyGameIdBtn.textContent = "Copy"), 900);
    });
  }

  if (copyPlayerUrlBtn) {
    copyPlayerUrlBtn.addEventListener("click", async () => {
      await copyToClipboard(makePlayerUrl(session.gameId));
      copyPlayerUrlBtn.textContent = "Copied!";
      setTimeout(() => (copyPlayerUrlBtn.textContent = "Copy"), 900);
    });
  }
}

function makePlayerUrl(gameId) {
  const url = new URL(window.location.href);

  // Normalize to player/index.html
  url.pathname = url.pathname
    .replace(/\/host\/index\.html$/, "/player/index.html")
    .replace(/\/host\/?$/, "/player/");

  url.searchParams.set("gameId", gameId);
  return url.toString();
}


async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for older browsers
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function init() {
  // --- Session UI elements ---
  const sessionNameInput = document.getElementById("sessionName");
  const createBtn = document.getElementById("createSessionBtn");
  const clearBtn = document.getElementById("clearSessionBtn");

  // --- Public message UI elements ---
  const publicMessageInput = document.getElementById("publicMessageInput");
  const setPublicMessageBtn = document.getElementById("setPublicMessageBtn");
  const clearPublicMessageBtn = document.getElementById("clearPublicMessageBtn");

  // --- Initial render: session ---
  const savedSession = getSavedSession();
  if (savedSession) {
    sessionNameInput.value = savedSession.sessionName || "";
    renderSession(savedSession);
  } else {
    renderSession(null);
  }

  // --- Initial render: public message ---
  if (publicMessageInput) {
    publicMessageInput.value = getPublicMessage();
  }
  renderPublicMessage();

  // --- Create session ---
  createBtn.addEventListener("click", () => {
    const createdAt = new Date().toISOString();
    const gameId = generateGameId();

    let sessionName = (sessionNameInput.value || "").trim();
    if (!sessionName) {
      sessionName = defaultSessionName(createdAt);
    }

    const session = { gameId, sessionName, createdAt };
    saveSession(session);
    renderSession(session);
  });

  // --- Clear session ---
  clearBtn.addEventListener("click", () => {
    clearSession();
    renderSession(null);
  });

  // --- Set public message ---
  if (setPublicMessageBtn) {
    setPublicMessageBtn.addEventListener("click", () => {
      const msg = (publicMessageInput?.value || "").trim();
      setPublicMessage(msg);
      renderPublicMessage();
    });
  }

  // --- Clear public message ---
  if (clearPublicMessageBtn) {
    clearPublicMessageBtn.addEventListener("click", () => {
      if (publicMessageInput) publicMessageInput.value = "";
      clearPublicMessage();
      renderPublicMessage();
    });
  }
}


function getPublicMessage() {
  return localStorage.getItem(STORAGE_KEYS.publicMessage) || "";
}

function setPublicMessage(message) {
  localStorage.setItem(STORAGE_KEYS.publicMessage, message);
}

function clearPublicMessage() {
  localStorage.removeItem(STORAGE_KEYS.publicMessage);
}

function renderPublicMessage() {
  const el = document.getElementById("publicMessageResult");
  if (!el) return;

  const msg = getPublicMessage();
  el.textContent = msg ? `Current: ${msg}` : "No public message set.";
}

document.addEventListener("DOMContentLoaded", init);
