// host/js/ui.js

const { escapeHtml } = window.GE.dom;

export function renderPlayersList({ statusText, players }) {
  const statusEl = document.getElementById("playersStatus");
  const listEl = document.getElementById("playersList");
  if (!statusEl || !listEl) return;

  statusEl.textContent = statusText || "";

  if (!players || players.length === 0) {
    listEl.innerHTML = `<span class="muted">No players have joined yet.</span>`;
    return;
        }

        // simple list, no fancy layout yet
        const items = players.map(p => {
        const name = p.player_name || "";
        const pronouns = (p.pronouns || "").trim();

        const label = pronouns
            ? `${name} (${pronouns})`
            : name;

        return `<div>• ${escapeHtml(label)}</div>`;
        }).join("");

  listEl.innerHTML = items;
}

export function clearTurnOrderCard() {
  // primary id
  document.getElementById("turnOrderCard")?.remove();

  // also remove by content signature, just in case id drifted
  document.querySelectorAll("section.card").forEach((el) => {
    const h2 = el.querySelector("h2");
    if (h2 && h2.textContent.trim().toLowerCase() === "turn order") {
      el.remove();
    }
  });
}



