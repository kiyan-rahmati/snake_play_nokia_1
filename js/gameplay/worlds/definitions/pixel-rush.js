(function (global) {
  "use strict";

  const world = {
    id: "world-02",
    name: "Pixel Rush",
    title: "Pixel Rush",
    description: "Race through a vibrant pixel world with faster gameplay and glowing retro colors.",

    order: 2,
    theme: "night",
    themeClass: "world-theme-pixel-rush",

    levelIds: [],

    musicTrack: "assets/audio/music/pixel-rush.mp3",

    audio: {
      music: "assets/audio/music/pixel-rush.mp3",
      volume: 0.75,
      ambientEnabled: true
    },

    visuals: {
      palette: "neon-pixel",
      background: "#101020",
      foreground: "#48f5c5",
      accent: "#ff4fd8",
      gridEnabled: true,
      scanlinesEnabled: true,
      glowEnabled: true,
      particleEffects: true
    },

    gameplay: {
      defaultMode: "challenge",
      wallCollision: "death",
      selfCollision: "death",
      wrapAround: false,
      obstaclesEnabled: true,
      initialSpeed: 7,
      speedMultiplier: 1.15,
      powerUpsEnabled: true
    },

    unlockRequirements: {
      type: "world-completion",
      worldId: "world-01"
    },

    rewards: {
      completionBonus: 500,
      unlockWorldIds: ["world-03"]
    },

    metadata: {
      chapter: 2,
      era: "arcade-futuristic",
      tags: ["pixel-art", "neon", "arcade", "speed"],
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