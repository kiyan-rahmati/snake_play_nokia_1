(function (global) {
  "use strict";

  const world = {
    id: "world-04",
    name: "Neon Overdrive",
    title: "Neon Overdrive",
    description: "Push your reflexes to the limit in a high-speed neon arena.",

    order: 4,
    theme: "night",
    themeClass: "world-theme-neon-overdrive",

    levelIds: [],

    musicTrack: "assets/audio/music/neon-overdrive.mp3",

    audio: {
      music: "assets/audio/music/neon-overdrive.mp3",
      volume: 0.8,
      ambientEnabled: true,
      ambientTrack: "assets/audio/ambient/neon-arena.mp3"
    },

    visuals: {
      palette: "cyber-neon",
      background: "#080817",
      foreground: "#00f5ff",
      accent: "#ff2d95",
      secondaryAccent: "#b45cff",
      gridEnabled: true,
      scanlinesEnabled: true,
      glowEnabled: true,
      particleEffects: true,
      vignetteEnabled: true,
      screenShakeEnabled: true
    },

    gameplay: {
      defaultMode: "endless",
      wallCollision: "death",
      selfCollision: "death",
      wrapAround: false,
      obstaclesEnabled: true,
      initialSpeed: 8,
      speedMultiplier: 1.2,
      powerUpsEnabled: true,
      dynamicObstacles: true,
      comboScoring: true
    },

    unlockRequirements: {
      type: "world-completion",
      worldId: "world-03"
    },

    rewards: {
      completionBonus: 1000,
      unlockWorldIds: ["world-05"]
    },

    metadata: {
      chapter: 4,
      era: "cyberpunk",
      tags: ["neon", "cyberpunk", "high-speed", "arcade"],
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