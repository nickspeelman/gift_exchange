// shared/js/storage.js
(() => {
  window.GE = window.GE || {};

  const KEYS = {
    gameId: "we_game_id",
    sessionName: "we_session_name",
    createdAt: "we_created_at",
    publicMessage: "we_public_message"
  };

  function getGameId() {
    return localStorage.getItem(KEYS.gameId) || "";
  }

  function setGameId(gameId) {
    localStorage.setItem(KEYS.gameId, gameId);
  }

  function getSavedSession() {
    const gameId = localStorage.getItem(KEYS.gameId);
    const sessionName = localStorage.getItem(KEYS.sessionName);
    const createdAt = localStorage.getItem(KEYS.createdAt);
    if (!gameId || !createdAt) return null;
    return { gameId, sessionName: sessionName || "", createdAt };
  }

  function saveSession({ gameId, sessionName, createdAt }) {
    localStorage.setItem(KEYS.gameId, gameId);
    localStorage.setItem(KEYS.sessionName, sessionName || "");
    localStorage.setItem(KEYS.createdAt, createdAt);
  }

  function clearSession() {
    localStorage.removeItem(KEYS.gameId);
    localStorage.removeItem(KEYS.sessionName);
    localStorage.removeItem(KEYS.createdAt);
    stopSessionPolling();
    stopPlayersPolling();
  }

  function getPublicMessage() {
    return localStorage.getItem(KEYS.publicMessage) || "";
  }

  function setPublicMessage(message) {
    localStorage.setItem(KEYS.publicMessage, message || "");
  }

  function clearPublicMessage() {
    localStorage.removeItem(KEYS.publicMessage);
  }

  window.GE.storage = {
    KEYS,
    getGameId,
    setGameId,
    getSavedSession,
    saveSession,
    clearSession,
    getPublicMessage,
    setPublicMessage,
    clearPublicMessage
  };
})();
