/**
 * Snake Nokia V2
 * Difficulty System
 */

(function (window) {
  "use strict";

  const PRESETS = Object.freeze({
    easy: {
      initialSpeed: 5,
      speedIncrement: 0.25,
      maxSpeed: 10,
      scoreThreshold: 100,
      obstacleDensity: 0.05
    },
    normal: {
      initialSpeed: 7,
      speedIncrement: 0.5,
      maxSpeed: 15,
      scoreThreshold: 150,
      obstacleDensity: 0.1
    },
    hard: {
      initialSpeed: 9,
      speedIncrement: 0.75,
      maxSpeed: 20,
      scoreThreshold: 200,
      obstacleDensity: 0.15
    },
    expert: {
      initialSpeed: 12,
      speedIncrement: 1,
      maxSpeed: 25,
      scoreThreshold: 250,
      obstacleDensity: 0.2
    }
  });

  function create(options = {}) {
    const requestedPreset = String(
      options.difficulty || "normal"
    ).toLowerCase();

    let difficulty = PRESETS[requestedPreset]
      ? requestedPreset
      : "normal";

    let config = {
      ...PRESETS[difficulty],
      ...options
    };

    let currentSpeed = Math.max(
      1,
      Number(config.initialSpeed) || 7
    );

    let currentLevel = 1;
    let lastScoreThreshold = 0;
    let totalSpeedIncreases = 0;
    let history = [];

    function record(type, details = {}) {
      history.push(Object.freeze({
        type,
        timestamp: Date.now(),
        difficulty,
        level: currentLevel,
        speed: currentSpeed,
        ...details
      }));

      if (history.length > 100) {
        history.shift();
      }
    }

    function setDifficulty(value) {
      const next = String(value || "").toLowerCase();

      if (!PRESETS[next]) {
        return false;
      }

      difficulty = next;
      config = {
        ...PRESETS[next],
        ...options
      };

      currentSpeed = Math.min(
        config.maxSpeed,
        config.initialSpeed
      );

      currentLevel = 1;
      lastScoreThreshold = 0;
      totalSpeedIncreases = 0;

      record("difficulty-changed");

      return true;
    }

    function updateFromScore(score) {
      const value = Number(score);

      if (!Number.isFinite(value) || value < 0) {
        return getSnapshot();
      }

      const threshold = Math.max(
        1,
        Number(config.scoreThreshold) || 150
      );

      const targetLevel = Math.floor(value / threshold) + 1;

      if (targetLevel > currentLevel) {
        const previousLevel = currentLevel;

        currentLevel = targetLevel;

        const targetSpeed = Math.min(
          config.maxSpeed,
          config.initialSpeed +
            (currentLevel - 1) * config.speedIncrement
        );

        if (targetSpeed > currentSpeed) {
          totalSpeedIncreases += 1;
          currentSpeed = targetSpeed;
        }

        lastScoreThreshold =
          Math.floor(value / threshold) * threshold;

        record("level-up", {
          previousLevel,
          score: value
        });
      }

      return getSnapshot();
    }

    function increaseDifficulty(amount = config.speedIncrement) {
      const increment = Number(amount);

      if (!Number.isFinite(increment) || increment <= 0) {
        return currentSpeed;
      }

      const previousSpeed = currentSpeed;

      currentSpeed = Math.min(
        Number(config.maxSpeed) || 15,
        currentSpeed + increment
      );

      if (currentSpeed > previousSpeed) {
        totalSpeedIncreases += 1;

        record("speed-increased", {
          previousSpeed
        });
      }

      return currentSpeed;
    }

    function decreaseDifficulty(amount = config.speedIncrement) {
      const decrement = Number(amount);

      if (!Number.isFinite(decrement) || decrement <= 0) {
        return currentSpeed;
      }

      const minimumSpeed = Math.max(
        1,
        Number(config.initialSpeed) || 1
      );

      const previousSpeed = currentSpeed;

      currentSpeed = Math.max(
        minimumSpeed,
        currentSpeed - decrement
      );

      if (currentSpeed !== previousSpeed) {
        record("speed-decreased", {
          previousSpeed
        });
      }

      return currentSpeed;
    }

    function setSpeed(value) {
      const next = Number(value);

      if (!Number.isFinite(next) || next <= 0) {
        return false;
      }

      currentSpeed = Math.min(
        Number(config.maxSpeed) || next,
        next
      );

      record("speed-set");

      return true;
    }

    function getSpeed() {
      return currentSpeed;
    }

    function getLevel() {
      return currentLevel;
    }

    function getDifficulty() {
      return difficulty;
    }

    function getObstacleDensity() {
      return Math.max(
        0,
        Math.min(
          1,
          Number(config.obstacleDensity) || 0
        )
      );
    }

    function getNextThreshold() {
      const threshold = Math.max(
        1,
        Number(config.scoreThreshold) || 150
      );

      return currentLevel * threshold;
    }

    function getHistory() {
      return history.slice();
    }

    function getSnapshot() {
      return Object.freeze({
        difficulty,
        currentSpeed,
        currentLevel,
        maxSpeed: config.maxSpeed,
        speedIncrement: config.speedIncrement,
        scoreThreshold: config.scoreThreshold,
        lastScoreThreshold,
        nextScoreThreshold: getNextThreshold(),
        obstacleDensity: getObstacleDensity(),
        totalSpeedIncreases
      });
    }

    function reset() {
      currentSpeed = Math.max(
        1,
        Number(config.initialSpeed) || 7
      );

      currentLevel = 1;
      lastScoreThreshold = 0;
      totalSpeedIncreases = 0;
      history = [];

      return getSnapshot();
    }

    return Object.freeze({
      setDifficulty,
      updateFromScore,
      increaseDifficulty,
      decreaseDifficulty,
      setSpeed,
      getSpeed,
      getLevel,
      getDifficulty,
      getObstacleDensity,
      getNextThreshold,
      getHistory,
      getSnapshot,
      reset
    });
  }

  window.SnakeDifficultySystem = Object.freeze({
    create,
    PRESETS
  });
})(window);