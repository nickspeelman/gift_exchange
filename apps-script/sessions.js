// apps-script/sessions.js



const Sessions = (() => {
  const SHEET_NAME = "sessions";

  const CURRENT_SCHEMA_VERSION = "2026-01-05";
  const SUPPORTED_SCHEMA_VERSIONS = new Set([CURRENT_SCHEMA_VERSION]);

  function createSession(payload) {
    payload = payload || {};

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      const nowIso = new Date().toISOString();
      const sessionId = Utilities.getUuid();

      const schemaVersion = payload.schema_version || CURRENT_SCHEMA_VERSION;
      if (!SUPPORTED_SCHEMA_VERSIONS.has(schemaVersion)) {
        // we'll convert this into a nice JSON error once we wire doPost
        throw new Error(`Unsupported schema_version: ${schemaVersion}`);
      }

      const rowObj = {
        session_id: sessionId,
        schema_version: schemaVersion,
        created_at: nowIso,
        updated_at: nowIso,
        status: "created",

        title: payload.title || "",
        host_name: payload.host_name || "",

        // accept either settings_json (string) or settings (object)
        settings_json: payload.settings_json
          ? String(payload.settings_json)
          : (payload.settings ? JSON.stringify(payload.settings) : ""),

        note: payload.note || ""
      };

      const writeResult = Sheets.appendObjectRow(SHEET_NAME, rowObj);

      return {
        session_id: sessionId,
        schema_version: schemaVersion,
        created_at: nowIso,
        updated_at: nowIso,
        status: "created",
        rowNumber: writeResult.rowNumber
      };
    } finally {
      lock.releaseLock();
    }
  }

  function getSession(session_id) {
    if (!session_id) throw new Error("Missing session_id.");

    const rowNumber = Sheets.findRowByValue("sessions", "session_id", session_id);
    if (!rowNumber) {
        throw new Error("Session not found.");
    }

    const row = Sheets.getRowObject("sessions", rowNumber);

    // Optional: parse settings_json into an object
    let settings = null;
    if (row.settings_json) {
        try { settings = JSON.parse(row.settings_json); } catch (_) {}
    }

    // Optional: parse turn_order_json into an object
        let turn_order = null;
        if (row.turn_order_json) {
        try { turn_order = JSON.parse(row.turn_order_json); } catch (_) {}
        }


return {
  session_id: row.session_id,
  title: row.title || "",
  status: row.status || "",
  created_at: row.created_at,
  updated_at: row.updated_at,
  host_name: row.host_name || "",
  schema_version: row.schema_version || "",
  settings,
  turn_order
};

    }

    function updateSessionStatus(payload) {
    const sessionId = String(payload && payload.session_id ? payload.session_id : "").trim();
    const status = String(payload && payload.status ? payload.status : "").trim();

    if (!sessionId) throw new Error("Missing session_id.");
    if (!status) throw new Error("Missing status.");

    const rowNumber = Sheets.findRowByValue("sessions", "session_id", sessionId);
    if (!rowNumber) throw new Error("Session not found.");

    const now = new Date().toISOString();

    Sheets.setCellByHeader("sessions", rowNumber, "status", status);
    Sheets.setCellByHeader("sessions", rowNumber, "updated_at", now);

    // Return in the same normalized shape as getSession
    return Sessions.getSession(sessionId);
    }

    function startGame(payload) {
        payload = payload || {};
        const sessionId = String(payload.session_id || "").trim();
        if (!sessionId) throw new Error("Missing session_id.");

        const lock = LockService.getScriptLock();
        lock.waitLock(15000);

        try {
            const rowNumber = Sheets.findRowByValue("sessions", "session_id", sessionId);
            if (!rowNumber) throw new Error("Session not found.");

            const sessionRow = Sheets.getRowObject("sessions", rowNumber);

            // Idempotent: if already started and has turn_order_json, return it.
            if (sessionRow.status === "started" && sessionRow.turn_order_json) {
            let turn_order = null;
            try { turn_order = JSON.parse(sessionRow.turn_order_json); } catch (_) {}
            return {
                session_id: sessionRow.session_id,
                status: sessionRow.status,
                turn_order
            };
            }

            if (sessionRow.status !== "created") {
            throw new Error(`Cannot start game from status: ${sessionRow.status}`);
            }

            const players = Players.listActivePlayersBySession(sessionId); // [{ player_id, player_name }, ...]
            if (!players || players.length < 2) throw new Error("Need at least 2 players to start.");

            // Prefer player_id; fallback to name if absolutely necessary
          const order = players.map(p => String(p.player_id || "").trim()).filter(Boolean);
          if (order.length !== players.length) throw new Error("Missing player_id for one or more players.");


            if (order.length < 2) throw new Error("Players missing player_id/player_name.");

            // Shuffle (Fisher–Yates)
            for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
            }

            const nowIso = new Date().toISOString();

            const turn_order = {
            version: 1,
            order,
            cursor: 0,
            direction: 1,
            cycle: 1,
            locked: true,
            reason: "game_start",
            last_updated_at: nowIso
            };

            Sheets.setCellByHeader("sessions", rowNumber, "status", "started");
            Sheets.setCellByHeader("sessions", rowNumber, "turn_order_json", JSON.stringify(turn_order));
            Sheets.setCellByHeader("sessions", rowNumber, "started_at", nowIso);
            Sheets.setCellByHeader("sessions", rowNumber, "updated_at", nowIso);

            return {
            session_id: sessionId,
            status: "started",
            turn_order
            };
        } finally {
            lock.releaseLock();
        }
        }




  return { createSession, getSession, updateSessionStatus, startGame };



})();
