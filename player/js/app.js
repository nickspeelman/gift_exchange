// player/js/app.js
import { callApi } from "../../shared/js/apiClient.js";
import { formatPlayerLabel } from "../../shared/js/ui.js";

function getSessionIdFromUrl_() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("gameId") || "").trim();
}

function key_(sessionId, suffix) {
  return `we_${suffix}::${sessionId}`;
}

function savePlayer_(sessionId, player) {
  localStorage.setItem(key_(sessionId, "player_id"), player.player_id);
  localStorage.setItem(key_(sessionId, "player_name"), player.player_name);
}

function show_(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "";
}

function hide_(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

function setText_(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

document.addEventListener("DOMContentLoaded", () => {
  const sessionId = getSessionIdFromUrl_();
  if (!sessionId) {
    show_("joinPanel");
    setText_("joinError", "Missing session_id in URL.");
    show_("joinError");
    return;
  }

  const joinForm = document.getElementById("joinForm");
  const joinButton = document.getElementById("joinButton");
  const nameInput = document.getElementById("playerNameInput");
  const pronounsInput = document.getElementById("playerPronouns");


  console.log("joinPanel?", !!document.getElementById("joinPanel"), "waitingPanel?", !!document.getElementById("waitingPanel"));

  // Start with join visible (we’ll refine this once we integrate with your session-status render)
  show_("joinPanel");
  hide_("waitingPanel");
  hide_("joinError");

  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const playerName = String(nameInput.value || "").trim();
    if (!playerName) {
      setText_("joinError", "Please enter your name.");
      show_("joinError");
      return;
    }

    function normalizePronouns(s) {
        return (s || "").trim().replace(/\s+/g, " ");
        }
    console.log(pronounsInput.value)
    const pronouns = normalizePronouns(pronounsInput.value);
    console.log(pronouns)

    // If required:
    if (!pronouns) {
        setText_("joinError","Please enter your pronouns.");
        show_("joinError");
    return;
}

    joinButton.disabled = true;
    nameInput.disabled = true;
    hide_("joinError");

        try {
    const result = await callApi({
    action: "joinSession",
    payload: {
        session_id: sessionId,
        player_name: playerName,
        pronouns: pronouns,              // ✅ NEW
    }
    });

      console.log("joinSession result:", result);

      // Support two shapes:
      // A) { ok: true, data: {...} }
      // B) { player_id: "...", player_name: "..." }  (data only)
      const player =
        (result && typeof result === "object" && "ok" in result)
          ? (result.ok ? result.data : null)
          : result;

      if (!player || !player.player_id) {
        // If your callApi returns envelope and ok=false, it likely threw already,
        // but this catches unexpected shapes.
        throw new Error((result && result.error) ? result.error : "Join failed (unexpected response).");
      }

      savePlayer_(sessionId, player);

      setText_("youAreLabel", `You are: ${formatPlayerLabel(player)}`);
      hide_("joinPanel");
      show_("waitingPanel");

      console.log("Joined:", player);

    } catch (err) {
      console.error("joinSession error:", err);

      // Try to surface the real backend message
      const msg =
        (err && err.message) ? err.message :
        (typeof err === "string") ? err :
        "Join failed.";

      setText_("joinError", msg);
      show_("joinError");

      joinButton.disabled = false;
      nameInput.disabled = false;
      nameInput.focus();
    }

  });
});
