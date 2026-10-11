/**
 * Snake Nokia V2
 * Endless Mode
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    id: "endless",
    name: "Endless",
    wallCollision: true,
    selfCollision: true,
    obstaclesEnabled: true,
    powerUpsEnabled: true,
    initialLives: 3,
    initialSpeed: 6,
    maxSpeed: 20,
    speedIncrement: 0.5,
    scorePerFood: 10,
    gridWidth: 20,
    gridHeight: 20,
    allowPause: true,
    allowRestart: true,
    difficultyInterval: 500,
    scorePerDifficultyStep: 100
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

    settings.initialLives = Math.max(
      1,
      Math.floor(Number(settings.initialLives) || DEFAULTS.initialLives)
    );

    settings.initialSpeed = Math.max(
      1,
      Number(settings.initialSpeed) || DEFAULTS.initialSpeed
    );

    settings.maxSpeed = Math.max(
      settings.initialSpeed,
      Number(settings.maxSpeed) || DEFAULTS.maxSpeed
    );

    settings.scorePerDifficultyStep = Math.max(
      1,
      Number(settings.scorePerDifficultyStep) ||
        DEFAULTS.scorePerDifficultyStep
    );

    let active = false;
    let paused = false;
    let completed = false;
    let startedAt = null;
    let endedAt = null;
    let score = 0;
    let foodCollected = 0;
    let lives = settings.initialLives;
    let speed = settings.initialSpeed;
    let difficultyLevel = 1;
    let endReason = null;
    let history = [];

    function record(type, metadata = {}) {
      history.push(Object.freeze({
        type,
        timestamp: Date.now(),
        score,
        foodCollected,
        lives,
        speed,
        difficultyLevel,
        ...metadata
      }));

      if (history.length > 200) {
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
      lives = settings.initialLives;
      speed = settings.initialSpeed;
      difficultyLevel = 1;
      endReason = null;
      history = [];

      record("started");

      return getSnapshot();
    }

    function pause() {
      if (
        !active ||
        paused ||
        completed ||
        !settings.allowPause
      ) {
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

    function updateDifficulty() {
      const nextLevel = Math.floor(
        score / settings.scorePerDifficultyStep
      ) + 1;

      if (nextLevel <= difficultyLevel) {
        return false;
      }

      const previousLevel = difficultyLevel;
      difficultyLevel = nextLevel;

      speed = Math.min(
        settings.maxSpeed,
        settings.initialSpeed +
          (difficultyLevel - 1) * settings.speedIncrement
      );

      record("difficulty-increased", {
        previousLevel
      });

      return true;
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

      updateDifficulty();

      return Object.freeze({
        success: true,
        added,
        score,
        foodCollected,
        speed,
        difficultyLevel
      });
    }

    function addScore(points) {
      if (!active || paused || completed) {
        return getSnapshot();
      }

      const amount = Number(points);

      if (!Number.isFinite(amount) || amount < 0) {
        return getSnapshot();
      }

      score += Math.floor(amount);

      record("score-added", {
        points: Math.floor(amount)
      });

      updateDifficulty();

      return getSnapshot();
    }

    function loseLife(amount = 1) {
      if (!active || paused || completed) {
        return getSnapshot();
      }

      const requested = Number(amount);

      if (!Number.isFinite(requested) || requested <= 0) {
        return getSnapshot();
      }

      const lost = Math.floor(requested);

      lives = Math.max(0, lives - lost);

      record("life-lost", {
        lost
      });

      if (lives <= 0) {
        return finish("no-lives-left");
      }

      return getSnapshot();
    }

    function addLife(amount = 1) {
      if (!active || paused || completed) {
        return getSnapshot();
      }

      const requested = Number(amount);

      if (!Number.isFinite(requested) || requested <= 0) {
        return getSnapshot();
      }

      const added = Math.floor(requested);

      lives += added;

      record("life-added", {
        added
      });

      return getSnapshot();
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

    function getElapsedTime() {
      if (startedAt === null) {
        return 0;
      }

      return Math.max(
        0,
        (endedAt ?? Date.now()) - startedAt
      );
    }

    function getHistory() {
      return history.slice();
    }

    function getSettings() {
      return Object.freeze({ ...settings });
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
        lives,
        speed,
        difficultyLevel,
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
      score = 0;
      foodCollected = 0;
      lives = settings.initialLives;
      speed = settings.initialSpeed;
      difficultyLevel = 1;
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
      addScore,
      loseLife,
      addLife,
      handleCollision,
      updateDifficulty,
      getElapsedTime,
      getHistory,
      getSettings,
      getSnapshot,
      reset
    });
  }

  window.SnakeEndlessMode = Object.freeze({
    create,
    DEFAULTS
  });
})(window);