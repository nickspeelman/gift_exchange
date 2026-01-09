// shared/js/sessionClient.js
import { callApi } from "./apiClient.js";

let timer = null;

export async function fetchSession(sessionId) {
  const data = await callApi({
    action: "getSession",
    payload: { session_id: sessionId }
  });
  return data; // should be the session object (already unwrapped by callApi)
}

export function stopSessionPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function startSessionPolling({
  sessionId,
  intervalMs = 2000,
  onTick,
  onError
}) {
  stopSessionPolling();

  const tick = async () => {
    try {
      const session = await fetchSession(sessionId);
      onTick?.(session);
    } catch (err) {
      onError?.(err);
    }
  };

  tick();
  timer = setInterval(tick, intervalMs);
}
