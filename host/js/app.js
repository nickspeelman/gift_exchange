// host/js/app.js

import { callApi } from "../../shared/js/apiClient.js";
import { renderPlayersList, clearTurnOrderCard } from "./ui.js";
import { startSessionPolling, stopSessionPolling } from "../../shared/js/session.js";
import { renderTurnOrderCard, buildPlayerById, normalizeTurnOrder } from "../../shared/js/ui.js";




const { escapeHtml } = window.GE.dom;
const storage = window.GE.storage;
const ids = window.GE.ids;
const API_URL = "https://script.google.com/macros/s/AKfycbyeAhYmacZ3HZcaBEJfNYEa3HG9gnKtkt97mjjzGDa66gR1ket3sqKa8hytxlJAwJOyLA/exec";







let playersPollTimer = null;
let playerNameById = {};
let latestPlayers = []




async function fetchPlayers(sessionId) {
  // Depending on how your apiClient is written, this might return `data` directly
  // or an envelope. The rest of your host app assumes `callApi` returns data.
  const data = await callApi({
    action: "listPlayers",
    payload: { session_id: sessionId }
  });

  // If callApi returns the data object directly, `data.players` exists.
  // If callApi returns envelope, adjust accordingly — but your existing createSession
  // code suggests it returns `data` directly. :contentReference[oaicite:1]{index=1}
  return data?.players || [];
}

function stopPlayersPolling() {
  if (playersPollTimer) {
    clearInterval(playersPollTimer);
    playersPollTimer = null;
  }
}

function startPlayersPolling(sessionId) {
  stopPlayersPolling();

  // immediate render
  renderPlayersList({ statusText: "Loading players…", players: [] });

  const tick = async () => {
    try {
      const players = await fetchPlayers(sessionId);
      latestPlayers = players;

      // build id -> name map for turn order rendering
        playerNameById = Object.fromEntries(players.map(p => [p.player_id, p.player_name || p.player_id]));


      renderPlayersList({
        statusText: `${players.length} player${players.length === 1 ? "" : "s"} joined`,
        players
      });
    } catch (err) {
      console.error("Failed to listPlayers:", err);
      renderPlayersList({
        statusText: "Could not load players.",
        players: []
      });
    }
  };

  tick();
  playersPollTimer = setInterval(tick, 2000);
}


async function fetchSessionStatus(sessionId) {
  stopPlayersPolling();
  stopSessionPolling?.();
  clearTurnOrderCard();

  const data = await callApi({
    action: "getSession",
    payload: { session_id: sessionId }
  });

  return data; // ✅ return the full session object
}


function setStatusText(status) {
  const el = document.getElementById("sessionStatus");
  if (!el) return;
  el.textContent = status ? status : "(unknown)";
}


function renderSession(session) {
  const result = document.getElementById("result");
  if (!result) return;

  // If you add roster polling elsewhere, stop it here when session clears.
  // stopPlayersPolling?.();

  if (!session) {
    result.innerHTML = `<em>No session saved locally.</em>`;
    // If you have a players card, reset it here too:
    // renderPlayersList?.({ statusText: "No session loaded.", players: [] });
    return;
  }

  const gameId = String(session.gameId || "").trim();
  const sessionName = String(session.sessionName || "");
  const createdAt = String(session.createdAt || "");
  const playerUrl = makePlayerUrl(gameId);

  result.innerHTML = `
    <div class="kv">
      <div><strong>Game ID</strong></div>
      <div class="mono">
        ${escapeHtml(gameId)}
        <button id="copyGameIdBtn" type="button" class="secondary" style="margin-left: 0.5rem;">Copy</button>
      </div>

      <div><strong>Session</strong></div>
      <div>${escapeHtml(sessionName)}</div>

      <div><strong>Created</strong></div>
      <div class="mono">${escapeHtml(createdAt)}</div>

      <div><strong>Status</strong></div>
      <div class="mono"><span id="sessionStatus">(loading...)</span></div>

      <div><strong>Player URL</strong></div>
      <div class="mono">
        ${escapeHtml(playerUrl)}
        <button id="copyPlayerUrlBtn" type="button" class="secondary" style="margin-left: 0.5rem;">Copy</button>
      </div>

      <div><strong>Host controls</strong></div>
      <div>
        <button id="startGameBtn" type="button">Start game</button>
      </div>
    </div>
  `;

  // --- Copy buttons ---
  document.getElementById("copyGameIdBtn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    await copyToClipboard(gameId);
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 900);
  });

  document.getElementById("copyPlayerUrlBtn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    await copyToClipboard(playerUrl);
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 900);
  });

  // --- Load status from backend (one-shot) ---
  // --- Load session state from backend (one-shot) ---
    fetchSessionStatus(gameId)
    .then((session) => {
        // Support both old (status string) and new (session object) returns
        const status = session?.status ?? "(unknown)";
        setStatusText(status);


        const startBtn = document.getElementById("startGameBtn");
        if (startBtn) {
        startBtn.disabled = status === "started";
        }

        // Optional: if turn order already exists, render it
        const turnOrder = normalizeTurnOrder(
        session?.turn_order ?? session?.initiative,
        { cursor: 0, direction: 1, version: 1 }
        );

        if (turnOrder?.order?.length) {

        renderTurnOrderCard({
            mount: result,
            turnOrder,
            players: latestPlayers
        });
        }

    })
    .catch((err) => {
        console.error("Failed to fetch session state:", err);
        setStatusText("(unknown)");
    });


  // If you add roster polling, start it here:
  startPlayersPolling?.(gameId);

  startSessionPolling({
    sessionId: gameId,
    intervalMs: 2000,
    onTick: (s) => {
        setStatusText(s?.status || "(unknown)");
    const turnOrder = normalizeTurnOrder(
    s?.turn_order ?? s?.initiative,
    { cursor: 0, direction: 1, version: 1 }
    );

       if (turnOrder?.order?.length) 
 {
        renderTurnOrderCard({
            mount: result,
            turnOrder,
            players: latestPlayers
        });
        }

    },
    onError: (err) => {
        console.error("Failed to poll session:", err);
    }
    });


// --- Start game ---
document.getElementById("startGameBtn")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;

  try {
    const res = await callApi({
      action: "startGame",
      payload: { session_id: gameId }
    });

    // Your callApi wrapper might return { ok, data } or just data.
    // Adjust these 2 lines to match your apiClient.
    const data = res?.data ?? res;

    // Update status in UI
    setStatusText("started");

    // OPTIONAL: render the turn order if present
   const turnOrder = normalizeTurnOrder(
  data?.turn_order ?? data?.initiative,
  { cursor: 0, direction: 1, version: 1 }
    );
    
    console.log("latestPlayers:", latestPlayers);
    console.log("turnOrder: ", turnOrder)
    console.log("result: ", result)

    if (turnOrder?.order?.length) {
    renderTurnOrderCard({
        mount: result,
        turnOrder,
        players: latestPlayers
    });
    }


    } catch (err) {
        console.error(err, err.api);
        alert(err.message || "Failed to start game.");
    } finally {
        btn.disabled = false;
    }
    });

}





function makePlayerUrl(gameId) {
  const url = new URL(window.location.href);

  // Works for /host/ and /host/index.html
  url.pathname = url.pathname
    .replace(/\/host\/index\.html$/, "/player/index.html")
    .replace(/\/host\/?$/, "/player/");

  url.searchParams.set("gameId", gameId);
  url.searchParams.set("session_id", gameId);

  return url.toString();
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function renderPublicMessage() {
  const el = document.getElementById("publicMessageResult");
  if (!el) return;

  const msg = storage.getPublicMessage();
  el.textContent = msg ? `Current: ${msg}` : "No public message set.";
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

  // Initial render: session
  const savedSession = storage.getSavedSession();
  if (savedSession) {
    sessionNameInput.value = savedSession.sessionName || "";
    renderSession(savedSession);
  } else {
    renderSession(null);
  }

  // Initial render: public message
  if (publicMessageInput) publicMessageInput.value = storage.getPublicMessage();
  renderPublicMessage();

  // Create session
  createBtn.addEventListener("click", async () => {
    createBtn.disabled = true;
 

    try {
        let sessionName = (sessionNameInput.value || "").trim();
        if (!sessionName) {
        sessionName = ids.defaultSessionName(new Date().toISOString());
        }

        const data = await callApi({
        action: "createSession",
        payload: {
            title: sessionName,
            host_name: "Nick",
            settings: { max_players: 12, locking_enabled: false }
        }
        });

        // 🔑 This is the key line
        const gameId = data.session_id;
        const createdAt = data.created_at;

        storage.saveSession({ gameId, sessionName, createdAt });
        clearTurnOrderCard();
        renderSession({ gameId, sessionName, createdAt });

    } catch (err) {
        console.error(err, err.api);
        alert(err.message || "Failed to create session.");
    } finally {
        createBtn.disabled = false;
    };


});


  // Clear session
  clearBtn.addEventListener("click", () => {
    storage.clearSession();
    renderSession(null);
    clearTurnOrderCard();

  });

  // Set public message
  setPublicMessageBtn?.addEventListener("click", () => {
    const msg = (publicMessageInput?.value || "").trim();
    storage.setPublicMessage(msg);
    renderPublicMessage();
  });

  // Clear public message
  clearPublicMessageBtn?.addEventListener("click", () => {
    if (publicMessageInput) publicMessageInput.value = "";
    storage.clearPublicMessage();
    renderPublicMessage();
  });
}







  


document.addEventListener("DOMContentLoaded", init)