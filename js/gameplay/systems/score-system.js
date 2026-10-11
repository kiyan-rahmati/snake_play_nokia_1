/**
 * Snake Nokia V2
 * Score System
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    initialScore: 0,
    pointsPerFood: 10,
    comboMultiplier: 1,
    maxScore: Number.MAX_SAFE_INTEGER,
    persistBestScore: true,
    storageKey: "snake-nokia-v2-best-score"
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    let score = Math.max(0, Number(settings.initialScore) || 0);
    let bestScore = 0;
    let totalPointsEarned = 0;
    let foodsCollected = 0;
    let combo = 0;
    let multiplier = Math.max(1, Number(settings.comboMultiplier) || 1);
    let history = [];

    function loadBestScore() {
      if (!settings.persistBestScore) {
        return;
      }

      try {
        const stored = window.localStorage.getItem(settings.storageKey);
        const parsed = Number(stored);

        if (Number.isFinite(parsed) && parsed >= 0) {
          bestScore = Math.floor(parsed);
        }
      } catch (error) {
        bestScore = 0;
      }
    }

    function saveBestScore() {
      if (!settings.persistBestScore) {
        return false;
      }

      try {
        window.localStorage.setItem(
          settings.storageKey,
          String(bestScore)
        );

        return true;
      } catch (error) {
        return false;
      }
    }

    function record(type, points, metadata = {}) {
      history.push(Object.freeze({
        type,
        points,
        score,
        timestamp: Date.now(),
        metadata: { ...metadata }
      }));

      if (history.length > 200) {
        history.shift();
      }
    }

    function updateBestScore() {
      if (score <= bestScore) {
        return false;
      }

      bestScore = score;
      saveBestScore();

      return true;
    }

    function addPoints(points, metadata = {}) {
      const amount = Number(points);

      if (!Number.isFinite(amount) || amount < 0) {
        return Object.freeze({
          success: false,
          added: 0,
          score,
          bestScore
        });
      }

      const requested = Math.floor(amount);
      const available = Math.max(0, settings.maxScore - score);
      const added = Math.min(requested, available);

      score += added;
      totalPointsEarned += added;

      record("add", added, metadata);

      const newBest = updateBestScore();

      return Object.freeze({
        success: true,
        added,
        score,
        bestScore,
        newBest
      });
    }

    function subtractPoints(points, metadata = {}) {
      const amount = Number(points);

      if (!Number.isFinite(amount) || amount < 0) {
        return Object.freeze({
          success: false,
          removed: 0,
          score
        });
      }

      const removed = Math.min(score, Math.floor(amount));

      score -= removed;

      record("subtract", -removed, metadata);

      return Object.freeze({
        success: true,
        removed,
        score
      });
    }

    function collectFood(food = {}) {
      const basePoints = Number(
        food.points ?? settings.pointsPerFood
      );

      if (!Number.isFinite(basePoints) || basePoints < 0) {
        return Object.freeze({
          success: false,
          added: 0,
          score
        });
      }

      combo += 1;

      const foodMultiplier = Math.max(
        1,
        Number(food.multiplier) || 1
      );

      const comboBonus = Math.max(1, multiplier);
      const earned = Math.floor(
        basePoints * foodMultiplier * comboBonus
      );

      const result = addPoints(earned, {
        source: "food",
        foodType: food.type || "normal",
        combo,
        multiplier: foodMultiplier * comboBonus
      });

      if (result.success) {
        foodsCollected += 1;
      }

      return Object.freeze({
        ...result,
        foodsCollected,
        combo
      });
    }

    function setMultiplier(value) {
      const next = Number(value);

      if (!Number.isFinite(next) || next < 1) {
        return false;
      }

      multiplier = next;
      return true;
    }

    function increaseCombo() {
      combo += 1;
      return combo;
    }

    function resetCombo() {
      combo = 0;
      return combo;
    }

    function getScore() {
      return score;
    }

    function getBestScore() {
      return bestScore;
    }

    function getTotalPointsEarned() {
      return totalPointsEarned;
    }

    function getFoodsCollected() {
      return foodsCollected;
    }

    function getCombo() {
      return combo;
    }

    function getMultiplier() {
      return multiplier;
    }

    function getHistory() {
      return history.slice();
    }

    function getSnapshot() {
      return Object.freeze({
        score,
        bestScore,
        totalPointsEarned,
        foodsCollected,
        combo,
        multiplier,
        historyLength: history.length
      });
    }

    function reset(options = {}) {
      score = Math.max(0, Number(options.initialScore) || 0);
      totalPointsEarned = 0;
      foodsCollected = 0;
      combo = 0;
      multiplier = Math.max(
        1,
        Number(settings.comboMultiplier) || 1
      );

      history = [];

      updateBestScore();

      return getSnapshot();
    }

    function resetAll() {
      score = 0;
      bestScore = 0;
      totalPointsEarned = 0;
      foodsCollected = 0;
      combo = 0;
      multiplier = 1;
      history = [];

      saveBestScore();

      return getSnapshot();
    }

    loadBestScore();

    return Object.freeze({
      addPoints,
      subtractPoints,
      collectFood,
      setMultiplier,
      increaseCombo,
      resetCombo,
      getScore,
      getBestScore,
      getTotalPointsEarned,
      getFoodsCollected,
      getCombo,
      getMultiplier,
      getHistory,
      getSnapshot,
      reset,
      resetAll
    });
  }

  window.SnakeScoreSystem = Object.freeze({
    create,
    DEFAULTS
  });
})(window);