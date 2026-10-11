/**
 * Snake Nokia V2
 * Game Session Manager
 */

(function (window) {
  "use strict";

  const state = {
    active: false,
    sessionId: null,
    mode: "classic",
    worldId: "nokia-origins",
    level: 1,
    startedAt: null,
    endedAt: null,
    startScore: 0,
    finalScore: null,
    endReason: null
  };

  function createSessionId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return [
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10)
    ].join("-");
  }

  function emit(eventName, detail) {
    window.document.dispatchEvent(
      new CustomEvent(`snake:${eventName}`, {
        detail: detail || {}
      })
    );
  }

  function getSnapshot() {
    return Object.freeze({
      ...state,
      duration: state.startedAt === null
        ? 0
        : (state.endedAt || Date.now()) - state.startedAt
    });
  }

  function start(options = {}) {
    if (state.active) {
      return false;
    }

    state.active = true;
    state.sessionId = createSessionId();
    state.mode = typeof options.mode === "string"
      ? options.mode
      : "classic";
    state.worldId = typeof options.worldId === "string"
      ? options.worldId
      : "nokia-origins";
    state.level = Number.isInteger(options.level) && options.level > 0
      ? options.level
      : 1;
    state.startedAt = Date.now();
    state.endedAt = null;
    state.startScore = Number.isFinite(options.startScore)
      ? options.startScore
      : 0;
    state.finalScore = null;
    state.endReason = null;

    emit("session-started", getSnapshot());

    return getSnapshot();
  }

  function finish(options = {}) {
    if (!state.active) {
      return false;
    }

    state.active = false;
    state.endedAt = Date.now();
    state.finalScore = Number.isFinite(options.score)
      ? options.score
      : state.startScore;
    state.endReason = typeof options.reason === "string"
      ? options.reason
      : "completed";

    const result = getSnapshot();

    emit("session-finished", result);

    return result;
  }

  function updateLevel(level) {
    if (!state.active || !Number.isInteger(level) || level < 1) {
      return false;
    }

    const previousLevel = state.level;
    state.level = level;

    if (previousLevel !== level) {
      emit("session-level-changed", {
        sessionId: state.sessionId,
        previousLevel,
        level
      });
    }

    return true;
  }

  function getCurrent() {
    return getSnapshot();
  }

  function isActive() {
    return state.active;
  }

  function reset() {
    if (state.active) {
      finish({
        score: state.startScore,
        reason: "reset"
      });
    }

    state.active = false;
    state.sessionId = null;
    state.mode = "classic";
    state.worldId = "nokia-origins";
    state.level = 1;
    state.startedAt = null;
    state.endedAt = null;
    state.startScore = 0;
    state.finalScore = null;
    state.endReason = null;

    emit("session-reset");

    return getSnapshot();
  }

  window.SnakeGameSession = Object.freeze({
    start,
    finish,
    updateLevel,
    getCurrent,
    isActive,
    reset
  });
})(window);