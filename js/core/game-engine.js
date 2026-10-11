/**
 * Snake Nokia V2
 * Core Game Engine
 */

(function (window) {
  "use strict";

  const state = {
    initialized: false,
    running: false,
    paused: false,
    destroyed: false,
    mode: "classic",
    score: 0,
    level: 1,
    startedAt: null
  };

  const listeners = new Map();

  function emit(eventName, detail = {}) {
    const event = new CustomEvent(`snake:${eventName}`, {
      detail
    });

    window.document.dispatchEvent(event);

    const callbacks = listeners.get(eventName);

    if (callbacks) {
      callbacks.forEach(function (callback) {
        try {
          callback(detail);
        } catch (error) {
          console.error(
            `[GameEngine] Event handler failed: ${eventName}`,
            error
          );
        }
      });
    }
  }

  function on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }

    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }

    listeners.get(eventName).add(callback);

    return function unsubscribe() {
      const callbacks = listeners.get(eventName);

      if (callbacks) {
        callbacks.delete(callback);

        if (callbacks.size === 0) {
          listeners.delete(eventName);
        }
      }
    };
  }

  function initialize(options = {}) {
    if (state.initialized && !state.destroyed) {
      return getState();
    }

    state.initialized = true;
    state.destroyed = false;
    state.running = false;
    state.paused = false;
    state.mode = options.mode || "classic";
    state.score = 0;
    state.level = 1;
    state.startedAt = null;

    emit("engine-initialized", {
      mode: state.mode
    });

    return getState();
  }

  function start(options = {}) {
    if (!state.initialized || state.destroyed) {
      initialize(options);
    }

    if (state.running) {
      return false;
    }

    state.running = true;
    state.paused = false;
    state.mode = options.mode || state.mode;
    state.score = 0;
    state.level = 1;
    state.startedAt = Date.now();

    emit("game-started", {
      mode: state.mode,
      score: state.score,
      level: state.level,
      startedAt: state.startedAt
    });

    return true;
  }

  function pause() {
    if (!state.running || state.paused) {
      return false;
    }

    state.paused = true;

    emit("game-paused", {
      score: state.score,
      level: state.level
    });

    return true;
  }

  function resume() {
    if (!state.running || !state.paused) {
      return false;
    }

    state.paused = false;

    emit("game-resumed", {
      score: state.score,
      level: state.level
    });

    return true;
  }

  function addScore(points) {
    if (
      !state.running ||
      state.paused ||
      !Number.isFinite(points) ||
      points <= 0
    ) {
      return false;
    }

    state.score += Math.floor(points);

    emit("score-changed", {
      score: state.score,
      points: Math.floor(points)
    });

    return state.score;
  }

  function setLevel(level) {
    if (!Number.isInteger(level) || level < 1) {
      return false;
    }

    const previousLevel = state.level;
    state.level = level;

    if (previousLevel !== level) {
      emit("level-changed", {
        previousLevel,
        level
      });
    }

    return true;
  }

  function end(reason = "completed") {
    if (!state.running) {
      return false;
    }

    const result = {
      reason,
      mode: state.mode,
      score: state.score,
      level: state.level,
      startedAt: state.startedAt,
      endedAt: Date.now(),
      duration: state.startedAt
        ? Date.now() - state.startedAt
        : 0
    };

    state.running = false;
    state.paused = false;

    emit("game-ended", result);

    return result;
  }

  function reset() {
    state.running = false;
    state.paused = false;
    state.score = 0;
    state.level = 1;
    state.startedAt = null;

    emit("game-reset", {
      mode: state.mode
    });

    return getState();
  }

  function getState() {
    return Object.freeze({
      initialized: state.initialized,
      running: state.running,
      paused: state.paused,
      destroyed: state.destroyed,
      mode: state.mode,
      score: state.score,
      level: state.level,
      startedAt: state.startedAt
    });
  }

  function destroy() {
    state.running = false;
    state.paused = false;
    state.initialized = false;
    state.destroyed = true;

    listeners.clear();

    emit("engine-destroyed");
  }

  window.SnakeGameEngine = Object.freeze({
    initialize,
    start,
    pause,
    resume,
    addScore,
    setLevel,
    end,
    reset,
    getState,
    on,
    destroy
  });
})(window);