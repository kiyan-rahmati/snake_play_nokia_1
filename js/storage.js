/**
 * storage.js — save data (profile, settings, stats, progress).
 * Never throws: if localStorage is blocked it silently falls back to memory.
 */
(function (global) {
  'use strict';
  const SP = (global.SP = global.SP || {});
  const KEY = 'snake-play-nokia:save:v2';

  function defaults() {
    return {
      version: 2,
      profile: { name: 'PLAYER', avatar: '🐍' },
      settings: { sound: true, grid: true, vibration: true, theme: 'night' },
      stats: { games: 0, food: 0, bonus: 0, totalScore: 0, longest: 0, playSeconds: 0 },
      best: {},
      completed: {},
      achievements: {},
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    ['profile', 'settings', 'stats'].forEach(function (k) {
      if (saved[k] && typeof saved[k] === 'object') Object.assign(base[k], saved[k]);
    });
    ['best', 'completed', 'achievements'].forEach(function (k) {
      if (saved[k] && typeof saved[k] === 'object') base[k] = Object.assign({}, saved[k]);
    });
    return base;
  }

  function createStore(storage) {
    let inMemoryOnly = false;
    let data;

    function read() {
      try {
        const raw = storage && storage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }
    function write() {
      try {
        if (!storage) throw new Error('no storage');
        storage.setItem(KEY, JSON.stringify(data));
      } catch (e) {
        inMemoryOnly = true; // progress still works, but is lost on reload
      }
    }

    data = merge(defaults(), read());

    return {
      get: function () { return data; },
      update: function (fn) { fn(data); write(); return data; },
      reset: function () { data = defaults(); write(); return data; },
      isUnlocked: function (worlds, id) {
        const i = worlds.findIndex(function (w) { return w.id === id; });
        if (i < 0) return false;
        if (i === 0) return true;
        return !!data.completed[worlds[i - 1].id];
      },
      isMemoryOnly: function () { return inMemoryOnly; },
    };
  }

  let browserStorage = null;
  try { browserStorage = global.localStorage || null; } catch (e) { browserStorage = null; }

  SP.createStore = createStore;
  SP.store = createStore(browserStorage);
})(typeof window !== 'undefined' ? window : globalThis);
