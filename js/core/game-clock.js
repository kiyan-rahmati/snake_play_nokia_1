/**
 * Snake Nokia V2
 * Game Clock
 */

(function (window) {
  "use strict";

  const state = {
    running: false,
    paused: false,
    startedAt: 0,
    lastResumedAt: 0,
    elapsedBeforePause: 0,
    intervalId: null,
    tickRate: 250
  };

  const listeners = new Set();

  function getElapsedTime() {
    if (!state.startedAt) {
      return 0;
    }

    if (state.paused) {
      return state.elapsedBeforePause;
    }

    if (state.running) {
      return state.elapsedBeforePause +
        (performance.now() - state.lastResumedAt);
    }

    return state.elapsedBeforePause;
  }

  function getElapsedSeconds() {
    return Math.floor(getElapsedTime() / 1000);
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
      ].join(":");
    }

    return [
      String(minutes).padStart(2, "0"),
      String(seconds).padStart(2, "0")
    ].join(":");
  }

  function notify() {
    const elapsed = getElapsedTime();

    const snapshot = Object.freeze({
      running: state.running,
      paused: state.paused,
      elapsedMilliseconds: elapsed,
      elapsedSeconds: Math.floor(elapsed / 1000),
      formatted: formatTime(elapsed)
    });

    listeners.forEach(function (callback) {
      try {
        callback(snapshot);
      } catch (error) {
        console.error("[GameClock] Listener failed:", error);
      }
    });

    window.document.dispatchEvent(
      new CustomEvent("snake:clock-tick", {
        detail: snapshot
      })
    );
  }

  function start(options = {}) {
    stop();

    state.tickRate = Number.isFinite(options.tickRate)
      ? Math.max(50, Math.min(1000, options.tickRate))
      : 250;

    state.startedAt = performance.now();
    state.lastResumedAt = state.startedAt;
    state.elapsedBeforePause = 0;
    state.running = true;
    state.paused = false;

    state.intervalId = window.setInterval(
      notify,
      state.tickRate
    );

    notify();

    window.document.dispatchEvent(
      new CustomEvent("snake:clock-started")
    );

    return true;
  }

  function pause() {
    if (!state.running || state.paused) {
      return false;
    }

    state.elapsedBeforePause = getElapsedTime();
    state.paused = true;
    state.running = false;

    if (state.intervalId !== null) {
      window.clearInterval(state.intervalId);
      state.intervalId = null;
    }

    notify();

    window.document.dispatchEvent(
      new CustomEvent("snake:clock-paused")
    );

    return true;
  }

  function resume() {
    if (!state.paused) {
      return false;
    }

    state.lastResumedAt = performance.now();
    state.paused = false;
    state.running = true;

    state.intervalId = window.setInterval(
      notify,
      state.tickRate
    );

    notify();

    window.document.dispatchEvent(
      new CustomEvent("snake:clock-resumed")
    );

    return true;
  }

  function stop() {
    if (state.intervalId !== null) {
      window.clearInterval(state.intervalId);
    }

    const wasActive = state.running || state.paused;

    state.intervalId = null;
    state.running = false;
    state.paused = false;
    state.startedAt = 0;
    state.lastResumedAt = 0;
    state.elapsedBeforePause = 0;

    if (wasActive) {
      window.document.dispatchEvent(
        new CustomEvent("snake:clock-stopped")
      );
    }

    return wasActive;
  }

  function reset() {
    const wasRunning = state.running;
    const wasPaused = state.paused;

    if (state.intervalId !== null) {
      window.clearInterval(state.intervalId);
      state.intervalId = null;
    }

    state.startedAt = performance.now();
    state.lastResumedAt = state.startedAt;
    state.elapsedBeforePause = 0;

    if (wasRunning) {
      state.intervalId = window.setInterval(
        notify,
        state.tickRate
      );
    } else if (wasPaused) {
      state.paused = true;
    }

    notify();

    return getElapsedTime();
  }

  function subscribe(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Clock listener must be a function.");
    }

    listeners.add(callback);

    return function unsubscribe() {
      listeners.delete(callback);
    };
  }

  function getStatus() {
    const elapsed = getElapsedTime();

    return Object.freeze({
      running: state.running,
      paused: state.paused,
      elapsedMilliseconds: elapsed,
      elapsedSeconds: Math.floor(elapsed / 1000),
      formatted: formatTime(elapsed)
    });
  }

  window.SnakeGameClock = Object.freeze({
    start,
    pause,
    resume,
    stop,
    reset,
    getElapsedTime,
    getElapsedSeconds,
    formatTime,
    subscribe,
    getStatus
  });
})(window);