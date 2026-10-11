/**
 * Snake Nokia V2
 * Wrap-Around Mode
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    id: "wrap-around",
    name: "Wrap Around",
    wallCollision: false,
    selfCollision: true,
    obstaclesEnabled: false,
    powerUpsEnabled: true,
    initialLives: 1,
    initialSpeed: 7,
    scorePerFood: 10,
    gridWidth: 20,
    gridHeight: 20,
    allowPause: true,
    allowRestart: true
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    settings.gridWidth = Math.max(
      1,
      Math.floor(Number(settings.gridWidth) || DEFAULTS.gridWidth)
    );

    settings.gridHeight = Math.max(
      1,
      Math.floor(Number(settings.gridHeight) || DEFAULTS.gridHeight)
    );

    let active = false;
    let paused = false;
    let completed = false;
    let startedAt = null;
    let endedAt = null;
    let score = 0;
    let foodCollected = 0;
    let wraps = 0;
    let endReason = null;
    let history = [];

    function record(type, metadata = {}) {
      history.push(Object.freeze({
        type,
        timestamp: Date.now(),
        score,
        foodCollected,
        wraps,
        ...metadata
      }));

      if (history.length > 100) {
        history.shift();
      }
    }

    function start() {
      active = true;
      paused = false;
      completed = false;
      startedAt = Date.now();
      endedAt = null;
      score = 0;
      foodCollected = 0;
      wraps = 0;
      endReason = null;
      history = [];

      record("started");

      return getSnapshot();
    }

    function normalizePosition(position) {
      if (!position) {
        return null;
      }

      const x = Number(position.x);
      const y = Number(position.y);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }

      return {
        x: ((Math.trunc(x) % settings.gridWidth) +
          settings.gridWidth) % settings.gridWidth,
        y: ((Math.trunc(y) % settings.gridHeight) +
          settings.gridHeight) % settings.gridHeight
      };
    }

    function movePosition(position, direction) {
      const current = normalizePosition(position);

      if (!current || !direction) {
        return null;
      }

      const dx = Number(direction.x) || 0;
      const dy = Number(direction.y) || 0;

      if (
        Math.abs(dx) + Math.abs(dy) !== 1
      ) {
        return null;
      }

      const next = normalizePosition({
        x: current.x + dx,
        y: current.y + dy
      });

      const wrapped =
        current.x + dx < 0 ||
        current.x + dx >= settings.gridWidth ||
        current.y + dy < 0 ||
        current.y + dy >= settings.gridHeight;

      if (wrapped) {
        wraps += 1;

        record("wrapped", {
          from: current,
          to: next,
          direction: { x: dx, y: dy }
        });
      }

      return Object.freeze({
        position: next,
        wrapped
      });
    }

    function registerFood(food = {}) {
      if (!active || paused || completed) {
        return Object.freeze({
          success: false,
          score,
          foodCollected
        });
      }

      const points = Number(
        food.points ?? settings.scorePerFood
      );

      if (!Number.isFinite(points) || points < 0) {
        return Object.freeze({
          success: false,
          score,
          foodCollected
        });
      }

      const added = Math.floor(points);

      score += added;
      foodCollected += 1;

      record("food-collected", {
        points: added,
        foodType: food.type || "normal"
      });

      return Object.freeze({
        success: true,
        added,
        score,
        foodCollected
      });
    }

    function pause() {
      if (!active || paused || completed || !settings.allowPause) {
        return false;
      }

      paused = true;
      record("paused");

      return true;
    }

    function resume() {
      if (!active || !paused || completed) {
        return false;
      }

      paused = false;
      record("resumed");

      return true;
    }

    function finish(reason = "game-over") {
      if (completed) {
        return getSnapshot();
      }

      active = false;
      paused = false;
      completed = true;
      endedAt = Date.now();
      endReason = String(reason);

      record("finished", {
        reason: endReason
      });

      return getSnapshot();
    }

    function handleCollision(type) {
      if (!active || paused || completed) {
        return getSnapshot();
      }

      const collisionType = String(type || "unknown");

      if (collisionType === "wall") {
        record("wall-crossing-ignored");
        return getSnapshot();
      }

      if (
        collisionType === "self" ||
        (collisionType === "obstacle" && settings.obstaclesEnabled)
      ) {
        return finish(collisionType);
      }

      return getSnapshot();
    }

    function getElapsedTime() {
      if (startedAt === null) {
        return 0;
      }

      return Math.max(
        0,
        (endedAt ?? Date.now()) - startedAt
      );
    }

    function getSettings() {
      return Object.freeze({ ...settings });
    }

    function getHistory() {
      return history.slice();
    }

    function getSnapshot() {
      return Object.freeze({
        id: settings.id,
        name: settings.name,
        active,
        paused,
        completed,
        score,
        foodCollected,
        wraps,
        elapsedTime: getElapsedTime(),
        startedAt,
        endedAt,
        endReason,
        gridWidth: settings.gridWidth,
        gridHeight: settings.gridHeight,
        settings: getSettings()
      });
    }

    function reset() {
      active = false;
      paused = false;
      completed = false;
      startedAt = null;
      endedAt = null;
      score = 0;
      foodCollected = 0;
      wraps = 0;
      endReason = null;
      history = [];

      return getSnapshot();
    }

    return Object.freeze({
      start,
      normalizePosition,
      movePosition,
      registerFood,
      pause,
      resume,
      finish,
      handleCollision,
      getElapsedTime,
      getSettings,
      getHistory,
      getSnapshot,
      reset
    });
  }

  window.SnakeWrapAroundMode = Object.freeze({
    create,
    DEFAULTS
  });
})(window);