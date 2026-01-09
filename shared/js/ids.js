// shared/js/ids.js
(() => {
  window.GE = window.GE || {};

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function base36Random(len = 6) {
    // Not crypto-secure (fine for party security model)
    return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
  }

  function generateGameId() {
    // Example: GE_20260105_143012_X9K2QF
    const d = new Date();
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mm = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    const rand = base36Random(6);

    return `GE_${y}${m}${day}_${hh}${mm}${ss}_${rand}`;
  }

  function defaultSessionName(createdAtIso) {
    const d = new Date(createdAtIso);
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `Gift Exchange ${y}-${m}-${day}`;
  }

  window.GE.ids = { generateGameId, defaultSessionName };
})();
