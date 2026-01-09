// apps-script/players.js

const Players = (() => {
  const PLAYERS_SHEET = "players";
  const SESSIONS_SHEET = "sessions";

  /**
   * Join a session (lobby only).
   * - Requires session.status === "created"
   * - Prevents duplicate display names (case/whitespace-insensitive)
   * - Writes a canonical state_json
   */
  function joinSession(payload) {
    payload = payload || {};

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      const sessionId = String(payload.session_id || "").trim();
      const playerName = String(payload.player_name || "").trim();
      const pronouns = String(payload.pronouns || "").trim();

      if (!sessionId) throw new Error("Missing session_id.");
      if (!playerName) throw new Error("Missing player_name.");
      if (!pronouns) throw new Error("Missing pronouns.");
      if (playerName.length > 40) throw new Error("player_name too long (max 40).");

      // 1) Validate session exists
      const sessionRowNumber = Sheets.findRowByValue(SESSIONS_SHEET, "session_id", sessionId);
      if (!sessionRowNumber) throw new Error("Session not found.");

      // 2) Validate joinable status
      const sessionRow = Sheets.getRowObject(SESSIONS_SHEET, sessionRowNumber);
      const status = String(sessionRow.status || "").trim();
      if (status !== "created") {
        throw new Error("Session is not joinable (must be status='created').");
      }

      // 3) Prevent duplicate names (case/whitespace-insensitive)
      if (playerNameTaken_(sessionId, playerName)) {
        throw new Error("That name is already taken in this session. Please choose a different name.");
      }

      const nowIso = new Date().toISOString();
      const playerId = Utilities.getUuid();

      // 4) Canonical initial player state (v1)
      const state = {
        schema_version: "player_state_v1",
        joined: true,
        joined_at: nowIso,
        // future: ready, has_gift, etc.
      };

      Sheets.appendObjectRow(PLAYERS_SHEET, {
        session_id: sessionId,
        player_id: playerId,
        player_name: playerName,
        created_at: nowIso,
        updated_at: nowIso,
        is_active: true,
        state_json: JSON.stringify(state),
        pronouns: pronouns
      });

      return {
        player_id: playerId,
        player_name: playerName,
        pronouns: pronouns,
      };
    } finally {
      lock.releaseLock();
    }
  }

  /**
   * List players for UI (host roster card, etc.)
   * Returns stable ordering by created_at.
   */
  function listPlayers(payload) {
    payload = payload || {};
    const sessionId = String(payload.session_id || "").trim();
    if (!sessionId) throw new Error("Missing session_id.");

    // Nice error vs empty list
    const sessionRowNumber = Sheets.findRowByValue(SESSIONS_SHEET, "session_id", sessionId);
    if (!sessionRowNumber) throw new Error("Session not found.");

    const all = Sheets.getAllRowObjects(PLAYERS_SHEET);

    const players = [];
    for (let i = 0; i < all.length; i++) {
      const rowObj = all[i];

      if (String(rowObj.session_id || "") !== sessionId) continue;
      if (rowObj.is_active === false) continue;

      players.push({
        player_id: String(rowObj.player_id || ""),
        player_name: String(rowObj.player_name || ""),
        pronouns: String(rowObj.pronouns || ""), 
        created_at: rowObj.created_at || "",
        updated_at: rowObj.updated_at || "",
        state: safeJsonParse_(rowObj.state_json)
      });
    }

    players.sort((a, b) => {
      const ta = Date.parse(a.created_at || "") || 0;
      const tb = Date.parse(b.created_at || "") || 0;
      return ta - tb;
    });

    return { players };
  }

  /**
   * Minimal list for game logic (startGame, turn order, etc.)
   * Filters to active + joined players.
   *
   * NOTE: This function takes session_id directly (not payload),
   * because it’s used internally by Sessions.startGame.
   */
  function listActivePlayersBySession(sessionId) {
    sessionId = String(sessionId || "").trim();
    if (!sessionId) throw new Error("Missing session_id.");

    const all = Sheets.getAllRowObjects(PLAYERS_SHEET);
    const out = [];

    for (let i = 0; i < all.length; i++) {
      const r = all[i];

      if (String(r.session_id || "") !== sessionId) continue;
      if (r.is_active === false) continue;

      const state = safeJsonParse_(r.state_json);
      // "joined" is our canonical flag
      if (state.joined !== true) continue;

      out.push({
        player_id: String(r.player_id || "").trim(),
        player_name: String(r.player_name || "").trim()
      });
    }

    return out;
  }

  return {
    joinSession,
    listPlayers,
    listActivePlayersBySession
  };
})();

/********************
 * Helpers (private)
 ********************/

function safeJsonParse_(value) {
  if (value === null || value === undefined || value === "") return {};
  try {
    if (typeof value === "object") return value;
    return JSON.parse(String(value));
  } catch (_) {
    return {};
  }
}

function normalizePlayerName_(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function playerNameTaken_(sessionId, playerName) {
  const want = normalizePlayerName_(playerName);
  if (!want) return false;

  const rows = Sheets.getAllRowObjects("players");
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r.session_id || "") !== sessionId) continue;
    if (r.is_active === false) continue;

    const have = normalizePlayerName_(r.player_name);
    if (have === want) return true;
  }
  return false;
}

function buildPlayerNameMap(players) {
  const map = {};
  for (const p of players) {
    if (p.player_id) {
      map[p.player_id] = p.player_name || p.player_id;
    }
  }
  return map;
}
