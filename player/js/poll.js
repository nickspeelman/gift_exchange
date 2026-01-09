// player/js/poll.js
import { callApi } from "../../shared/js/apiClient.js";

// Polls getSession until status changes, then stops.
// Guardrails:
// - one in-flight request at a time
// - tick immediately on start
export function createSessionPoller({
  sessionId,
  intervalMs = 1500,
  onTick,        // (sessionObj) => void
  onStatusChange // ({ from, to, session }) => void
} = {}) {
  if (!sessionId) throw new Error("createSessionPoller: missing sessionId");

  let timer = null;
  let stopped = false;
  let inFlight = false;
  let lastStatus = null;

  async function tick() {
    if (stopped) return;
    if (inFlight) return;
    inFlight = true;

    try {
      const session = await callApi({
        action: "getSession",
        payload: { session_id: sessionId }
      });

      const status = session?.status ?? null;

      // first successful fetch establishes baseline
      if (lastStatus === null) lastStatus = status;

      // optional UI updates each tick
      onTick?.(session);

      // stop when status changes
      if (status !== lastStatus) {
        const from = lastStatus;
        lastStatus = status;

        stop();
        onStatusChange?.({ from, to: status, session });
      }
    } catch (err) {
      // don't stop; transient errors are fine during early dev
      console.error("Polling getSession failed:", err, err?.api);
    } finally {
      inFlight = false;
    }
  }

  function start() {
    if (timer || stopped) return;
    tick();
    timer = setInterval(tick, intervalMs);
  }

  function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, stop };
}
