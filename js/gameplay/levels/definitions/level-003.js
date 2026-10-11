// level-003.js
(function (global) {
  "use strict";

  const level = {
    id: "003",
    name: "The Narrow Path",
    description: "Navigate narrow corridors and avoid the obstacles.",
    worldId: "world-01",

    width: 20,
    height: 15,

    difficulty: "normal",
    mode: "classic",

    spawn: {
      x: 2,
      y: 7,
      direction: "right",
      initialLength: 4
    },

    food: {
      type: "classic",
      count: 1,
      respawn: true,
      points: 15
    },

    obstacles: [
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 5, y: 2 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 5, y: 9 },
      { x: 5, y: 10 },
      { x: 5, y: 11 },
      { x: 5, y: 12 },
      { x: 5, y: 13 },
      { x: 5, y: 14 },

      { x: 10, y: 0 },
      { x: 10, y: 1 },
      { x: 10, y: 2 },
      { x: 10, y: 3 },
      { x: 10, y: 4 },
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
      { x: 10, y: 13 },
      { x: 10, y: 14 },

      { x: 15, y: 0 },
      { x: 15, y: 1 },
      { x: 15, y: 2 },
      { x: 15, y: 3 },
      { x: 15, y: 4 },
      { x: 15, y: 5 },
      { x: 15, y: 9 },
      { x: 15, y: 10 },
      { x: 15, y: 11 },
      { x: 15, y: 12 },
      { x: 15, y: 13 },
      { x: 15, y: 14 }
    ],

    objectives: [
      {
        id: "collect-10-food",
        type: "collect-food",
        target: 10,
        description: "Collect 10 food items."
      },
      {
        id: "survive-90-seconds",
        type: "survive-time",
        target: 90,
        description: "Survive for 90 seconds."
      }
    ],

    rules: {
      wallCollision: "death",
      selfCollision: "death",
      wrapAround: false,
      obstaclesEnabled: true,
      allowReverseDirection: false
    },

    limits: {
      timeLimitSeconds: 180,
      targetScore: 150,
      targetFood: 10
    },

    rewards: {
      score: 200,
      unlockNextLevel: true
    },

    metadata: {
      order: 3,
      chapter: 1,
      tags: ["corridors", "precision", "obstacles"]
    }
  };

  const validator = global.SnakeLevelValidator;

  if (validator && typeof validator.assertValid === "function") {
    validator.assertValid(level);
  }

  const registry = global.SnakeLevelRegistry;

  if (registry && typeof registry.register === "function") {
    if (!registry.has(level.id)) {
      registry.register(level);
    }
  }

  global.SnakeLevelDefinitions = global.SnakeLevelDefinitions || {};
  global.SnakeLevelDefinitions[level.id] = Object.freeze(level);
})(window);