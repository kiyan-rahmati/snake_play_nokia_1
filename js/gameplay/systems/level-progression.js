/**
 * Snake Nokia V2
 * Level Progression System
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    initialLevel: 1,
    maxLevel: 100,
    pointsPerLevel: 150,
    pointsMultiplier: 1.25,
    minimumPointsPerLevel: 50,
    autoProgress: true
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    settings.initialLevel = Math.max(
      1,
      Math.floor(Number(settings.initialLevel) || 1)
    );

    settings.maxLevel = Math.max(
      settings.initialLevel,
      Math.floor(Number(settings.maxLevel) || 100)
    );

    settings.pointsPerLevel = Math.max(
      1,
      Number(settings.pointsPerLevel) || 150
    );

    settings.pointsMultiplier = Math.max(
      1,
      Number(settings.pointsMultiplier) || 1.25
    );

    settings.minimumPointsPerLevel = Math.max(
      1,
      Number(settings.minimumPointsPerLevel) || 50
    );

    let level = settings.initialLevel;
    let totalScore = 0;
    let levelScore = 0;
    let levelsCompleted = 0;
    let progressHistory = [];
    let completed = false;

    function getRequiredScore(targetLevel = level) {
      const target = Math.max(
        settings.initialLevel,
        Math.floor(Number(targetLevel) || settings.initialLevel)
      );

      const exponent = target - settings.initialLevel;

      return Math.max(
        settings.minimumPointsPerLevel,
        Math.floor(
          settings.pointsPerLevel *
          Math.pow(settings.pointsMultiplier, exponent)
        )
      );
    }

    function record(type, metadata = {}) {
      progressHistory.push(Object.freeze({
        type,
        level,
        totalScore,
        levelScore,
        timestamp: Date.now(),
        ...metadata
      }));

      if (progressHistory.length > 100) {
        progressHistory.shift();
      }
    }

    function advanceLevel(metadata = {}) {
      if (completed || level >= settings.maxLevel) {
        completed = true;

        return Object.freeze({
          success: false,
          level,
          completed,
          reason: "max-level-reached"
        });
      }

      const previousLevel = level;

      level += 1;
      levelsCompleted += 1;
      levelScore = 0;

      if (level >= settings.maxLevel) {
        completed = true;
      }

      record("level-up", {
        previousLevel,
        metadata: { ...metadata }
      });

      return Object.freeze({
        success: true,
        previousLevel,
        level,
        levelsCompleted,
        completed
      });
    }

    function addScore(points, metadata = {}) {
      const amount = Number(points);

      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        completed
      ) {
        return Object.freeze({
          success: false,
          added: 0,
          level,
          totalScore,
          levelScore,
          completed
        });
      }

      const added = Math.floor(amount);

      totalScore += added;
      levelScore += added;

      record("score-added", {
        added,
        metadata: { ...metadata }
      });

      const levelUps = [];

      if (settings.autoProgress) {
        let safetyCounter = 0;

        while (
          !completed &&
          levelScore >= getRequiredScore(level) &&
          safetyCounter < settings.maxLevel
        ) {
          const required = getRequiredScore(level);

          levelScore -= required;

          const result = advanceLevel({
            source: "score",
            ...metadata
          });

          if (!result.success) {
            levelScore = Math.min(
              levelScore + required,
              getRequiredScore(level)
            );
            break;
          }

          levelUps.push(result);
          safetyCounter += 1;
        }
      }

      return Object.freeze({
        success: true,
        added,
        level,
        totalScore,
        levelScore,
        requiredScore: getRequiredScore(level),
        progress: getProgress(),
        levelUps,
        completed
      });
    }

    function setLevel(value, metadata = {}) {
      const next = Number(value);

      if (
        !Number.isInteger(next) ||
        next < settings.initialLevel ||
        next > settings.maxLevel
      ) {
        return false;
      }

      const previousLevel = level;

      level = next;
      levelScore = 0;
      completed = level >= settings.maxLevel;

      record("level-set", {
        previousLevel,
        metadata: { ...metadata }
      });

      return true;
    }

    function getProgress() {
      const required = getRequiredScore(level);

      return Object.freeze({
        level,
        currentScore: levelScore,
        requiredScore: required,
        remainingScore: Math.max(0, required - levelScore),
        percentage: Math.min(
          100,
          Math.max(0, (levelScore / required) * 100)
        )
      });
    }

    function getLevel() {
      return level;
    }

    function getTotalScore() {
      return totalScore;
    }

    function getLevelScore() {
      return levelScore;
    }

    function getLevelsCompleted() {
      return levelsCompleted;
    }

    function isCompleted() {
      return completed;
    }

    function getHistory() {
      return progressHistory.slice();
    }

    function getSnapshot() {
      return Object.freeze({
        level,
        initialLevel: settings.initialLevel,
        maxLevel: settings.maxLevel,
        totalScore,
        levelScore,
        levelsCompleted,
        requiredScore: getRequiredScore(level),
        progress: getProgress(),
        completed
      });
    }

    function reset(overrides = {}) {
      const initial = Number(
        overrides.initialLevel ?? settings.initialLevel
      );

      level = Math.min(
        settings.maxLevel,
        Math.max(
          settings.initialLevel,
          Number.isInteger(initial)
            ? initial
            : settings.initialLevel
        )
      );

      totalScore = 0;
      levelScore = 0;
      levelsCompleted = 0;
      progressHistory = [];
      completed = level >= settings.maxLevel;

      return getSnapshot();
    }

    return Object.freeze({
      getRequiredScore,
      advanceLevel,
      addScore,
      setLevel,
      getProgress,
      getLevel,
      getTotalScore,
      getLevelScore,
      getLevelsCompleted,
      isCompleted,
      getHistory,
      getSnapshot,
      reset
    });
  }

  window.SnakeLevelProgression = Object.freeze({
    create,
    DEFAULTS
  });
})(window);