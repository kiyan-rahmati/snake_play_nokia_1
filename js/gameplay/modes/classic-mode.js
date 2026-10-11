/**
 * Snake Nokia V2
 * Classic Mode
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    id: "classic",
    name: "Classic",
    wallCollision: true,
    selfCollision: true,
    obstaclesEnabled: false,
    powerUpsEnabled: false,
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

    let active = false;
    let paused = false;
    let completed = false;
    let startedAt = null;
    let endedAt = null;
    let foodCollected = 0;
    let score = 0;
    let endReason = null;
    let history = [];

    function record(type, metadata = {}) {
      history.push(Object.freeze({
        type,
        timestamp: Date.now(),
        score,
        foodCollected,
        ...metadata
      }));

      if (history.length > 100) {
        history.shift();
      }
    }

    function start() {
      if (active && !paused) {
        return getSnapshot();
      }

      active = true;
      paused = false;
      completed = false;
      startedAt = Date.now();
      endedAt = null;
      foodCollected = 0;
      score = 0;
      endReason = null;
      history = [];

      record("started");

      return getSnapshot();
    }

    function pause() {
      if (!active || paused || !settings.allowPause) {
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

    function handleCollision(type) {
      if (!active || paused || completed) {
        return getSnapshot();
      }

      const collisionType = String(type || "unknown");

      if (
        collisionType === "wall" &&
        !settings.wallCollision
      ) {
        return getSnapshot();
      }

      if (
        collisionType === "self" &&
        !settings.selfCollision
      ) {
        return getSnapshot();
      }

      if (
        collisionType === "obstacle" &&
        !settings.obstaclesEnabled
      ) {
        return getSnapshot();
      }

      return finish(collisionType);
    }

    function canPause() {
      return Boolean(
        active &&
        !paused &&
        !completed &&
        settings.allowPause
      );
    }

    function canRestart() {
      return Boolean(settings.allowRestart);
    }

    function getElapsedTime() {
      if (startedAt === null) {
        return 0;
      }

      const end = endedAt ?? Date.now();

      return Math.max(0, end - startedAt);
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
        elapsedTime: getElapsedTime(),
        startedAt,
        endedAt,
        endReason,
        settings: getSettings()
      });
    }

    function reset() {
      active = false;
      paused = false;
      completed = false;
      startedAt = null;
      endedAt = null;
      foodCollected = 0;
      score = 0;
      endReason = null;
      history = [];

      return getSnapshot();
    }

    return Object.freeze({
      start,
      pause,
      resume,
      finish,
      registerFood,
      handleCollision,
      canPause,
      canRestart,
      getElapsedTime,
      getSettings,
      getHistory,
      getSnapshot,
      reset
    });
  }

  window.SnakeClassicMode = Object.freeze({
    create,
    DEFAULTS
  });
})(window);