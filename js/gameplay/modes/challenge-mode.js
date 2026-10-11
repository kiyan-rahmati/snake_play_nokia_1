/**
 * Snake Nokia V2
 * Challenge Mode
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    id: "challenge",
    name: "Challenge",
    timeLimit: 120000,
    targetScore: 300,
    targetFood: 20,
    initialLives: 3,
    initialSpeed: 8,
    scorePerFood: 10,
    gridWidth: 20,
    gridHeight: 20,
    allowPause: true,
    allowRestart: true,
    obstaclesEnabled: true,
    powerUpsEnabled: true
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    settings.timeLimit = Math.max(
      1000,
      Number(settings.timeLimit) || DEFAULTS.timeLimit
    );

    settings.targetScore = Math.max(
      1,
      Math.floor(Number(settings.targetScore) || DEFAULTS.targetScore)
    );

    settings.targetFood = Math.max(
      1,
      Math.floor(Number(settings.targetFood) || DEFAULTS.targetFood)
    );

    settings.initialLives = Math.max(
      1,
      Math.floor(Number(settings.initialLives) || DEFAULTS.initialLives)
    );

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
    let successful = false;
    let startedAt = null;
    let endedAt = null;
    let pausedDuration = 0;
    let pauseStartedAt = null;
    let score = 0;
    let foodCollected = 0;
    let lives = settings.initialLives;
    let endReason = null;
    let history = [];

    function record(type, metadata = {}) {
      history.push(Object.freeze({
        type,
        timestamp: Date.now(),
        score,
        foodCollected,
        lives,
        ...metadata
      }));

      if (history.length > 100) {
        history.shift();
      }
    }

    function getElapsedTime(now = Date.now()) {
      if (startedAt === null) {
        return 0;
      }

      const end = endedAt ?? now;
      const currentPause = paused && pauseStartedAt !== null
        ? Math.max(0, now - pauseStartedAt)
        : 0;

      return Math.max(
        0,
        end - startedAt - pausedDuration - currentPause
      );
    }

    function getRemainingTime(now = Date.now()) {
      return Math.max(
        0,
        settings.timeLimit - getElapsedTime(now)
      );
    }

    function checkSuccess() {
      return (
        score >= settings.targetScore ||
        foodCollected >= settings.targetFood
      );
    }

    function start() {
      if (active && !completed) {
        return getSnapshot();
      }

      active = true;
      paused = false;
      completed = false;
      successful = false;
      startedAt = Date.now();
      endedAt = null;
      pausedDuration = 0;
      pauseStartedAt = null;
      score = 0;
      foodCollected = 0;
      lives = settings.initialLives;
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
      pauseStartedAt = Date.now();

      record("paused");

      return true;
    }

    function resume() {
      if (
        !active ||
        !paused ||
        completed
      ) {
        return false;
      }

      if (pauseStartedAt !== null) {
        pausedDuration += Date.now() - pauseStartedAt;
      }

      pauseStartedAt = null;
      paused = false;

      record("resumed");

      return true;
    }

    function finish(success, reason) {
      if (completed) {
        return getSnapshot();
      }

      completed = true;
      successful = Boolean(success);
      active = false;
      paused = false;
      endedAt = Date.now();
      endReason = String(reason || "finished");
      pauseStartedAt = null;

      record("finished", {
        successful,
        reason: endReason
      });

      return getSnapshot();
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

      if (checkSuccess()) {
        return finish(true, "target-reached");
      }

      return getSnapshot();
    }

    function registerFood(food = {}) {
      if (!active || paused || completed) {
        return getSnapshot();
      }

      const points = Number(
        food.points ?? settings.scorePerFood
      );

      if (!Number.isFinite(points) || points < 0) {
        return getSnapshot();
      }

      foodCollected += 1;
      score += Math.floor(points);

      record("food-collected", {
        points: Math.floor(points),
        foodType: food.type || "normal"
      });

      if (checkSuccess()) {
        return finish(true, "target-reached");
      }

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

      lives = Math.max(
        0,
        lives - Math.floor(requested)
      );

      record("life-lost");

      if (lives === 0) {
        return finish(false, "no-lives-left");
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

      lives += Math.floor(requested);

      record("life-added", {
        amount: Math.floor(requested)
      });

      return getSnapshot();
    }

    function update(now = Date.now()) {
      if (!active || paused || completed) {
        return getSnapshot();
      }

      if (getRemainingTime(now) <= 0) {
        return finish(false, "time-expired");
      }

      if (checkSuccess()) {
        return finish(true, "target-reached");
      }

      return getSnapshot();
    }

    function getProgress() {
      const scoreProgress = Math.min(
        1,
        score / settings.targetScore
      );

      const foodProgress = Math.min(
        1,
        foodCollected / settings.targetFood
      );

      return Object.freeze({
        score: scoreProgress * 100,
        food: foodProgress * 100,
        overall: Math.max(scoreProgress, foodProgress) * 100
      });
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
        successful,
        score,
        foodCollected,
        lives,
        targetScore: settings.targetScore,
        targetFood: settings.targetFood,
        elapsedTime: getElapsedTime(),
        remainingTime: getRemainingTime(),
        progress: getProgress(),
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
      successful = false;
      startedAt = null;
      endedAt = null;
      pausedDuration = 0;
      pauseStartedAt = null;
      score = 0;
      foodCollected = 0;
      lives = settings.initialLives;
      endReason = null;
      history = [];

      return getSnapshot();
    }

    return Object.freeze({
      start,
      pause,
      resume,
      finish,
      addScore,
      registerFood,
      loseLife,
      addLife,
      update,
      getElapsedTime,
      getRemainingTime,
      getProgress,
      getHistory,
      getSettings,
      getSnapshot,
      reset
    });
  }

  window.SnakeChallengeMode = Object.freeze({
    create,
    DEFAULTS
  });
})(window);