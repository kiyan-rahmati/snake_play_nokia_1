/**
 * achievements.js — definitions + evaluation. Pure functions, easy to test.
 * ctx = { stats, completed, best, run: { score, length, seconds } }
 */
(function (global) {
  'use strict';
  const SP = (global.SP = global.SP || {});

  function worldsDone(ctx) {
    return Object.keys(ctx.completed || {}).filter(function (k) { return ctx.completed[k]; }).length;
  }

  const LIST = [
    { id: 'first_game', icon: '🎮', title: 'First Steps', text: 'Play your first game.',
      progress: function (c) { return [c.stats.games, 1]; } },
    { id: 'first_food', icon: '🍎', title: 'First Snack', text: 'Eat your first food.',
      progress: function (c) { return [c.stats.food, 1]; } },
    { id: 'food_100', icon: '🍽️', title: 'Snack Collector', text: 'Eat 100 food items in total.',
      progress: function (c) { return [c.stats.food, 100]; } },
    { id: 'food_500', icon: '🥇', title: 'Feast Master', text: 'Eat 500 food items in total.',
      progress: function (c) { return [c.stats.food, 500]; } },
    { id: 'score_200', icon: '⭐', title: 'Rising Star', text: 'Score 200 points in one run.',
      progress: function (c) { return [Math.max(c.run ? c.run.score : 0, maxBest(c)), 200]; } },
    { id: 'score_600', icon: '🌟', title: 'Score Hunter', text: 'Score 600 points in one run.',
      progress: function (c) { return [Math.max(c.run ? c.run.score : 0, maxBest(c)), 600]; } },
    { id: 'score_1500', icon: '💎', title: 'Diamond Snake', text: 'Score 1500 points in one run.',
      progress: function (c) { return [Math.max(c.run ? c.run.score : 0, maxBest(c)), 1500]; } },
    { id: 'long_15', icon: '📏', title: 'Growing Up', text: 'Reach a length of 15.',
      progress: function (c) { return [c.stats.longest, 15]; } },
    { id: 'long_30', icon: '🐉', title: 'Long Boi', text: 'Reach a length of 30.',
      progress: function (c) { return [c.stats.longest, 30]; } },
    { id: 'bonus_5', icon: '✨', title: 'Bonus Hunter', text: 'Catch 5 bonus stars.',
      progress: function (c) { return [c.stats.bonus, 5]; } },
    { id: 'survivor', icon: '⏱️', title: 'Survivor', text: 'Survive 60 seconds in one run.',
      progress: function (c) { return [Math.min(60, c.run ? Math.floor(c.run.seconds) : 0), 60]; } },
    { id: 'world_1', icon: '🚪', title: 'World Cleared', text: 'Complete your first world.',
      progress: function (c) { return [worldsDone(c), 1]; } },
    { id: 'world_5', icon: '👑', title: 'Nokia Legend', text: 'Complete all five worlds.',
      progress: function (c) { return [worldsDone(c), 5]; } },
  ];

  function maxBest(c) {
    return Object.keys(c.best || {}).reduce(function (m, k) { return Math.max(m, c.best[k] || 0); }, 0);
  }

  /** Returns the achievements that are now complete but not yet recorded. */
  function evaluate(ctx, unlocked) {
    return LIST.filter(function (a) {
      if (unlocked && unlocked[a.id]) return false;
      const p = a.progress(ctx);
      return p[0] >= p[1];
    });
  }

  SP.achievements = { LIST: LIST, evaluate: evaluate };
})(typeof window !== 'undefined' ? window : globalThis);
