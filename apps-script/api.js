// apps-script/api.js

function doPost(e) {
  const requestId = Utilities.getUuid();

  try {
    const req = parseJsonBody_(e);
    const action = req.action;
    const payload = req.payload || {};
    const expectedKey = PropertiesService.getScriptProperties().getProperty("API_KEY") || "";
    const providedKey = String(req.api_key || "").trim();

    if (expectedKey && providedKey !== expectedKey) {
    return json_({ ok: false, error: "Unauthorized.", request_id: requestId });
    }



    if (!action) {
      return json_({ ok: false, error: "Missing 'action'.", request_id: requestId });
    }

    switch (action) {
    case "createSession": {
        const data = Sessions.createSession(payload);
        return json_({ ok: true, data, request_id: requestId });
    }

    case "getSession": {
        const data = Sessions.getSession(payload.session_id);
        return json_({ ok: true, data, request_id: requestId });
    }

    case "updateSessionStatus": {
        const data = Sessions.updateSessionStatus(payload);
        return json_({ ok: true, data, request_id: requestId });
    }

    case "joinSession": {
        const data = Players.joinSession(payload);
        return json_({ ok: true, data, request_id: requestId });
    }

    case "listPlayers": {
        const data = Players.listPlayers(payload);
        return json_({ ok: true, data, request_id: requestId });
    }

    case "startGame": {
        const data = Sessions.startGame(payload);
        return json_({ ok: true, data });
    }



    default:
        return json_({
        ok: false,
        error: `Unknown action: ${action}`,
        request_id: requestId
        });
    }

  } catch (err) {
    console.error("request_id:", requestId, err);
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      request_id: requestId
    });
  }
}

function parseJsonBody_(e) {
  if (!e) throw new Error("Missing request.");

  // A) If sent as x-www-form-urlencoded: request=<json>
  if (e.parameter && e.parameter.request) {
    try {
      return JSON.parse(e.parameter.request);
    } catch (err) {
      throw new Error("Invalid JSON in 'request' parameter.");
    }
  }

  // B) If sent as raw JSON body (curl / server-to-server)
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      throw new Error("Invalid JSON body.");
    }
  }

  throw new Error("Missing request body.");
}


function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return json_({
    ok: true,
    service: "white-elephant-api",
    current_schema_version: "2026-01-05",
    time: new Date().toISOString()
  });
}


