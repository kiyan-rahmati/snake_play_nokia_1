/**
 * Snake Nokia V2
 * Game Loop
 */

(function (window) {
  "use strict";

  const state = {
    running: false,
    paused: false,
    animationFrameId: null,
    lastFrameTime: 0,
    deltaTime: 0,
    elapsedTime: 0,
    targetFPS: 60,
    frameCount: 0,
    updateCallback: null,
    renderCallback: null
  };

  const MAX_DELTA_TIME = 100;
  const FRAME_INTERVAL = 1000 / 60;

  function tick(timestamp) {
    if (!state.running || state.paused) {
      state.animationFrameId = null;
      return;
    }

    if (!state.lastFrameTime) {
      state.lastFrameTime = timestamp;
    }

    state.deltaTime = Math.min(
      timestamp - state.lastFrameTime,
      MAX_DELTA_TIME
    );

    state.lastFrameTime = timestamp;
    state.elapsedTime += state.deltaTime;
    state.frameCount += 1;

    try {
      if (typeof state.updateCallback === "function") {
        state.updateCallback(state.deltaTime, timestamp);
      }

      if (typeof state.renderCallback === "function") {
        state.renderCallback(state.deltaTime, timestamp);
      }
    } catch (error) {
      stop();

      console.error("[GameLoop] Frame processing failed:", error);

      window.document.dispatchEvent(
        new CustomEvent("snake:game-loop-error", {
          detail: {
            message: error.message || "Game loop failed."
          }
        })
      );

      return;
    }

    state.animationFrameId = window.requestAnimationFrame(tick);
  }

  function start(options = {}) {
    if (state.running) {
      return false;
    }

    state.updateCallback =
      typeof options.update === "function"
        ? options.update
        : null;

    state.renderCallback =
      typeof options.render === "function"
        ? options.render
        : null;

    state.targetFPS = Number.isFinite(options.targetFPS)
      ? Math.max(1, Math.min(60, options.targetFPS))
      : 60;

    state.running = true;
    state.paused = false;
    state.lastFrameTime = 0;
    state.deltaTime = 0;
    state.elapsedTime = 0;
    state.frameCount = 0;

    state.animationFrameId = window.requestAnimationFrame(tick);

    window.document.dispatchEvent(
      new CustomEvent("snake:loop-started")
    );

    return true;
  }

  function pause() {
    if (!state.running || state.paused) {
      return false;
    }

    state.paused = true;

    if (state.animationFrameId !== null) {
      window.cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }

    state.lastFrameTime = 0;

    window.document.dispatchEvent(
      new CustomEvent("snake:loop-paused")
    );

    return true;
  }

  function resume() {
    if (!state.running || !state.paused) {
      return false;
    }

    state.paused = false;
    state.lastFrameTime = 0;
    state.animationFrameId = window.requestAnimationFrame(tick);

    window.document.dispatchEvent(
      new CustomEvent("snake:loop-resumed")
    );

    return true;
  }

  function stop() {
    if (state.animationFrameId !== null) {
      window.cancelAnimationFrame(state.animationFrameId);
    }

    const wasRunning = state.running;

    state.running = false;
    state.paused = false;
    state.animationFrameId = null;
    state.lastFrameTime = 0;

    if (wasRunning) {
      window.document.dispatchEvent(
        new CustomEvent("snake:loop-stopped")
      );
    }

    return wasRunning;
  }

  function setCallbacks(options = {}) {
    if (typeof options.update === "function") {
      state.updateCallback = options.update;
    }

    if (typeof options.render === "function") {
      state.renderCallback = options.render;
    }
  }

  function getStatus() {
    return {
      running: state.running,
      paused: state.paused,
      deltaTime: state.deltaTime,
      elapsedTime: state.elapsedTime,
      frameCount: state.frameCount,
      targetFPS: state.targetFPS
    };
  }

  function destroy() {
    stop();

    state.updateCallback = null;
    state.renderCallback = null;
    state.deltaTime = 0;
    state.elapsedTime = 0;
    state.frameCount = 0;
  }

  window.SnakeGameLoop = Object.freeze({
    start,
    pause,
    resume,
    stop,
    setCallbacks,
    getStatus,
    destroy
  });
})(window);