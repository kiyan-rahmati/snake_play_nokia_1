/**
 * config.js — constants and the five world definitions.
 * Everything that describes "what the game is" lives here as plain data.
 */
(function (global) {
  'use strict';
  const SP = (global.SP = global.SP || {});

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  /* ---------- tiny layout builder: '#' = wall, '.' = free ---------- */
  function buildLayout(cols, rows, rects) {
    const g = Array.from({ length: rows }, function () { return Array(cols).fill('.'); });
    rects.forEach(function (r) {
      for (let y = r[1]; y <= r[3]; y++) {
        for (let x = r[0]; x <= r[2]; x++) g[y][x] = '#';
      }
    });
    return g.map(function (row) { return row.join(''); });
  }

  const WORLDS = [
    {
      id: 'nokia-origins',
      order: 1,
      name: 'Nokia Origins',
      subtitle: 'Where the legend begins',
      description: 'The classic monochrome LCD snake. No tricks, just you and the walls.',
      icon: '📟',
      style: 'lcd',
      cols: 20, rows: 16,
      wrap: false,
      speed: { start: 7, max: 13, step: 0.5, every: 3 },
      foodPoints: 10,
      bonus: null,
      layout: null,
      growObstacles: null,
      targetScore: 300,
      palette: {
        page: '#172316', board: '#a6c17c', boardAlt: '#a0bb76', grid: 'rgba(36,53,29,0.12)',
        head: '#1b2915', tail: '#2f4426', food: '#24351d', bonus: '#24351d',
        obstacle: '#24351d', glow: false,
      },
    },
    {
      id: 'pixel-rush',
      order: 2,
      name: 'Pixel Rush',
      subtitle: 'Speed up. Power through.',
      description: 'Colourful pixels, faster ticks, and walls that wrap around the screen.',
      icon: '🕹️',
      style: 'pixel',
      cols: 22, rows: 16,
      wrap: true,
      speed: { start: 9, max: 17, step: 0.6, every: 3 },
      foodPoints: 15,
      bonus: { every: 5, points: 50, ttl: 55, growth: 2 },
      layout: null,
      growObstacles: null,
      targetScore: 500,
      palette: {
        page: '#1a1033', board: '#2b1b57', boardAlt: '#301f63', grid: 'rgba(255,255,255,0.06)',
        head: '#ffd23f', tail: '#ff4f79', food: '#6bf2a6', bonus: '#ffd23f',
        obstacle: '#8b5cf6', glow: false,
      },
    },
    {
      id: 'snake-maze',
      order: 3,
      name: 'Snake Maze',
      subtitle: 'Find your way out',
      description: 'Stone corridors. Plan every turn before the maze traps you.',
      icon: '🧩',
      style: 'maze',
      cols: 24, rows: 18,
      wrap: false,
      speed: { start: 8, max: 14, step: 0.5, every: 3 },
      foodPoints: 15,
      bonus: { every: 6, points: 60, ttl: 70, growth: 2 },
      layout: buildLayout(24, 18, [
        [8, 0, 8, 8], [8, 12, 8, 17],
        [15, 3, 15, 13],
        [19, 0, 19, 6], [19, 11, 19, 17],
        [11, 15, 13, 15], [11, 2, 13, 2],
      ]),
      growObstacles: null,
      targetScore: 600,
      palette: {
        page: '#0f1a14', board: '#2c3a33', boardAlt: '#303f37', grid: 'rgba(255,255,255,0.05)',
        head: '#b6f46b', tail: '#3f8f3a', food: '#ff5d5d', bonus: '#ffd166',
        obstacle: '#8a7a5c', glow: false,
      },
    },
    {
      id: 'neon-overdrive',
      order: 4,
      name: 'Neon Overdrive',
      subtitle: 'No brakes. No limits.',
      description: 'A glowing arena that gets crowded. New barriers appear as you eat.',
      icon: '⚡',
      style: 'neon',
      cols: 26, rows: 18,
      wrap: true,
      speed: { start: 11, max: 20, step: 0.6, every: 3 },
      foodPoints: 20,
      bonus: { every: 5, points: 80, ttl: 80, growth: 3 },
      layout: null,
      growObstacles: { every: 4, max: 10 },
      targetScore: 800,
      palette: {
        page: '#05060f', board: '#0a0d24', boardAlt: '#0c1030', grid: 'rgba(0,245,255,0.08)',
        head: '#00f5ff', tail: '#ff2bd6', food: '#fff700', bonus: '#ff9f1c',
        obstacle: '#ff2bd6', glow: true,
      },
    },
    {
      id: 'nokia-legend',
      order: 5,
      name: 'Nokia Legend',
      subtitle: 'Legends never stop growing',
      description: 'The final stage. A big LCD maze, bonus fruit, and a snake that never slows down.',
      icon: '👑',
      style: 'lcd',
      cols: 28, rows: 20,
      wrap: false,
      speed: { start: 10, max: 18, step: 0.5, every: 3 },
      foodPoints: 20,
      bonus: { every: 4, points: 100, ttl: 75, growth: 3 },
      layout: buildLayout(28, 20, [
        [9, 2, 9, 7], [9, 13, 9, 18],
        [18, 2, 18, 7], [18, 13, 18, 18],
        [13, 5, 14, 5], [13, 14, 14, 14],
        [23, 4, 24, 5], [23, 14, 24, 15],
        [3, 3, 5, 3], [3, 16, 5, 16],
      ]),
      growObstacles: null,
      targetScore: 1000,
      palette: {
        page: '#0d1409', board: '#b5d08a', boardAlt: '#afca84', grid: 'rgba(29,43,21,0.12)',
        head: '#17230f', tail: '#2d4222', food: '#1d2b15', bonus: '#7a4b00',
        obstacle: '#1d2b15', glow: false,
      },
    },
  ];

  SP.CONST = { DIRS: DIRS, OPPOSITE: OPPOSITE, VERSION: '2.0.0' };
  SP.WORLDS = WORLDS;
  SP.getWorld = function (id) {
    return WORLDS.find(function (w) { return w.id === id; }) || null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
