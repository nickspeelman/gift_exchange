function TEST_sessionsHeaderMap() {
  const map = Sheets.getHeaderMap("sessions");
  console.log(JSON.stringify(map, null, 2));
}

function TEST_appendSessionRow() {
  const nowIso = new Date().toISOString();

  const rowObj = {
    session_id: "TEST-" + Utilities.getUuid(),
    schema_version: "2026-01-05",
    created_at: nowIso,
    updated_at: nowIso,
    status: "created",
    title: "Header-map smoke test",
    host_name: "Nick",
    settings_json: JSON.stringify({ max_players: 12, locking_enabled: false }),
    note: "If you see this row, mapping works."
  };

  const result = Sheets.appendObjectRow("sessions", rowObj);
  console.log(JSON.stringify(result, null, 2));
}

function TEST_createSession() {
  const result = Sessions.createSession({
    title: "CreateSession smoke test",
    host_name: "Nick",
    settings: { max_players: 12, locking_enabled: false },
    note: "If you see this, Sessions.createSession works."
    // schema_version omitted on purpose -> should default
  });

  console.log(JSON.stringify(result, null, 2));
}
