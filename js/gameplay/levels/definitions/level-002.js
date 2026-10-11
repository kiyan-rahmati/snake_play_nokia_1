(function (global) {
  "use strict";

  const level = {
    id: "002",
    name: "Corner Challenge",
    description: "Navigate tight turns and collect food without hitting the walls.",
    worldId: "world-01",

    width: 20,
    height: 15,

    difficulty: "easy",
    mode: "classic",

    spawn: {
      x: 3,
      y: 3,
      direction: "right",
      initialLength: 3
    },

    food: {
      type: "classic",
      count: 1,
      respawn: true,
      points: 10
    },

    obstacles: [
      { x: 8, y: 3 },
      { x: 8, y: 4 },
      { x: 8, y: 5 },
      { x: 8, y: 9 },
      { x: 8, y: 10 },
      { x: 8, y: 11 },
      { x: 12, y: 3 },
      { x: 12, y: 4 },
      { x: 12, y: 5 },
      { x: 12, y: 9 },
      { x: 12, y: 10 },
      { x: 12, y: 11 }
    ],

    objectives: [
      {
        id: "collect-8-food",
        type: "collect-food",
        target: 8,
        description: "Collect 8 food items."
      },
      {
        id: "reach-score-80",
        type: "reach-score",
        target: 80,
        description: "Reach a score of 80."
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
      timeLimitSeconds: 120,
      targetScore: 80,
      targetFood: 8
    },

    rewards: {
      score: 150,
      unlockNextLevel: true
    },

    metadata: {
      order: 2,
      chapter: 1,
      tags: ["corners", "obstacles", "beginner"]
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