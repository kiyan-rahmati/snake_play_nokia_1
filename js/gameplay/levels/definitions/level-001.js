(function (global) {
  "use strict";

  const level = {
    id: "001",
    name: "First Steps",
    description: "Learn the basics of the classic Nokia Snake game.",
    worldId: "world-01",

    width: 20,
    height: 15,

    difficulty: "easy",
    mode: "classic",

    spawn: {
      x: 5,
      y: 7,
      direction: "right",
      initialLength: 3
    },

    food: {
      type: "classic",
      count: 1,
      respawn: true,
      points: 10
    },

    obstacles: [],

    objectives: [
      {
        id: "collect-5-food",
        type: "collect-food",
        target: 5,
        description: "Collect 5 food items."
      },
      {
        id: "reach-score-50",
        type: "reach-score",
        target: 50,
        description: "Reach a score of 50."
      }
    ],

    rules: {
      wallCollision: "death",
      selfCollision: "death",
      wrapAround: false,
      obstaclesEnabled: false,
      allowReverseDirection: false
    },

    limits: {
      timeLimitSeconds: null,
      targetScore: 50,
      targetFood: 5
    },

    rewards: {
      score: 100,
      unlockNextLevel: true
    },

    metadata: {
      order: 1,
      chapter: 1,
      tags: ["tutorial", "classic", "beginner"]
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