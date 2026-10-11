(function (global) {
  "use strict";

  const world = {
    id: "world-03",
    name: "Snake Maze",
    title: "Snake Maze",
    description: "Explore winding corridors, dodge dangerous obstacles, and find your way through the maze.",

    order: 3,
    theme: "night",
    themeClass: "world-theme-snake-maze",

    levelIds: [],

    musicTrack: "assets/audio/music/snake-maze.mp3",

    audio: {
      music: "assets/audio/music/snake-maze.mp3",
      volume: 0.55,
      ambientEnabled: true,
      ambientTrack: "assets/audio/ambient/maze-atmosphere.mp3"
    },

    visuals: {
      palette: "deep-forest",
      background: "#101a18",
      foreground: "#7de2a8",
      accent: "#e6c76a",
      gridEnabled: true,
      scanlinesEnabled: false,
      glowEnabled: true,
      particleEffects: false,
      vignetteEnabled: true
    },

    gameplay: {
      defaultMode: "challenge",
      wallCollision: "death",
      selfCollision: "death",
      wrapAround: false,
      obstaclesEnabled: true,
      initialSpeed: 4,
      speedMultiplier: 1.05,
      powerUpsEnabled: true,
      limitedVisibility: false
    },

    unlockRequirements: {
      type: "world-completion",
      worldId: "world-02"
    },

    rewards: {
      completionBonus: 750,
      unlockWorldIds: ["world-04"]
    },

    metadata: {
      chapter: 3,
      era: "mystery",
      tags: ["maze", "exploration", "obstacles", "strategy"],
      featured: false
    }
  };

  const registry = global.SnakeWorldRegistry;

  if (registry && typeof registry.register === "function") {
    if (!registry.has(world.id)) {
      registry.register(world);
    }
  }

  global.SnakeWorldDefinitions = global.SnakeWorldDefinitions || {};
  global.SnakeWorldDefinitions[world.id] = Object.freeze(world);
})(window);