// shared/js/ui.js

/**
 * Render a turn order card into a host/player page.
 *
 * @param {Object} opts
 * @param {HTMLElement|string} opts.mount - Element or element id to append the card to.
 * @param {Object} opts.turnOrder - { order: [player_id...], cursor, version, ... }
 * @param {Object} [opts.playerNameById] - { [player_id]: player_name }
 * @param {string} [opts.cardId] - DOM id for the card (default "turnOrderCard")
 * @param {string} [opts.title] - Card title (default "Turn order")
 */

export function buildPlayerById(players = []) {
  const map = {};

  players.forEach(p => {
    const id = p.player_id || p.id;
    if (!id) return;

    map[id] = {
      id,
      name: p.player_name || p.name || "",
      pronouns: (p.pronouns || "").trim()
    };
  });

  return map;
}

export function renderTurnOrderCard({
  mount,
  turnOrder,

  // ✅ Preferred input
  players = [],

  // ✅ Legacy support (optional)
  playerNameById = {},

  cardId = "turnOrderCard",
  title = "Turn order"
}) {
  if (!turnOrder) return;

  const mountEl =
    typeof mount === "string" ? document.getElementById(mount) : mount;

  if (!mountEl) return;

  let card = document.getElementById(cardId);

  if (!card) {
    card = document.createElement("section");
    card.className = "card";
    card.id = cardId;
    card.innerHTML = `
      <h2>${escapeHtml_(title)}</h2>
      <div class="mono" style="margin-bottom: 0.5rem;">
        <span data-role="meta"></span>
      </div>
      <ol data-role="list"></ol>
    `;
    mountEl.appendChild(card);
  }

  const meta = card.querySelector('[data-role="meta"]');
  const list = card.querySelector('[data-role="list"]');
  if (!list) return;

  const order = Array.isArray(turnOrder.order) ? turnOrder.order : [];
  const cursor = Number.isInteger(turnOrder.cursor) ? turnOrder.cursor : 0;
  const direction = turnOrder.direction === -1 ? -1 : 1;

  // ✅ Build playerById once, from players
  const playerById = buildPlayerById(players);

  const getPlayer = (pid) =>
    playerById[pid] ||
    { id: pid, name: playerNameById[pid] || pid, pronouns: "" };

  const activePlayerId = order[cursor];
  const nextIndex =
    order.length > 0
      ? (cursor + direction + order.length) % order.length
      : null;
  const nextPlayerId = nextIndex !== null ? order[nextIndex] : null;

  if (meta) {
    const activeLabel = activePlayerId
      ? formatPlayerLabel(getPlayer(activePlayerId))
      : "—";
    const nextLabel = nextPlayerId
      ? formatPlayerLabel(getPlayer(nextPlayerId))
      : "—";

    meta.innerHTML = `
      <div style="font-size:1.05em; line-height:1.4;">
        <div>
          <span style="font-weight:600; text-decoration:underline;">
            Active Player:
          </span>
          ${escapeHtml_(activeLabel)}
        </div>
        <div>
          <span style="font-weight:600; text-decoration:underline;">
            Up Next:
          </span>
          ${escapeHtml_(nextLabel)}
        </div>
      </div>
    `;
  }

  const dirArrow = direction === -1 ? " ⬆︎" : " ⬇︎";

  list.innerHTML = "";
  order.forEach((pid, i) => {
    const li = document.createElement("li");
    const player = getPlayer(pid);
    const isCurrent = i === cursor;

    if (isCurrent) {
      const strong = document.createElement("strong");
      strong.textContent = `${formatPlayerLabel(player)}${dirArrow}`;
      li.appendChild(strong);
    } else {
      li.textContent = formatPlayerLabel(player);
    }

    list.appendChild(li);
  });
}






function escapeHtml_(s) {
  // Use GE.dom.escapeHtml if available, otherwise fallback.
  if (window?.GE?.dom?.escapeHtml) return window.GE.dom.escapeHtml(String(s ?? ""));
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatPlayerLabel(player = {}) {
  const name = player.name || player.player_name || player.id || "";
  const pronouns = (player.pronouns || "").trim();
  return pronouns ? `${name} (${pronouns})` : name;
}


export function normalizeTurnOrder(input = {}, fallback = {}) {
  // input can be: { order, cursor, direction, version }
  // or raw arrays (like initiative)
  const maybeArray = Array.isArray(input) ? input : null;

  const order =
    Array.isArray(input.order) ? input.order :
    maybeArray ? maybeArray :
    Array.isArray(fallback.order) ? fallback.order :
    [];

  const cursorRaw =
    Number.isInteger(input.cursor) ? input.cursor :
    Number.isInteger(fallback.cursor) ? fallback.cursor :
    0;

  const cursor = Math.max(0, Math.min(cursorRaw, Math.max(0, order.length - 1)));

  const direction =
    input.direction === -1 || input.direction === 1 ? input.direction :
    fallback.direction === -1 || fallback.direction === 1 ? fallback.direction :
    1;

  const version =
    typeof input.version === "number" ? input.version :
    typeof fallback.version === "number" ? fallback.version :
    1;

  return { order, cursor, direction, version };
}
