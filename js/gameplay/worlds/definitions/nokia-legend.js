(function (global) {
  "use strict";

  const world = {
    id: "world-05",
    name: "Nokia Legend",
    title: "Nokia Legend",
    description: "Return to the golden age of mobile gaming and master the legendary Snake.",

    order: 5,
    theme: "day",
    themeClass: "world-theme-nokia-legend",

    levelIds: [],

    audio: {
      music: "assets/audio/music/nokia-legend.mp3",
      volume: 0.65,
      ambientEnabled: false,
      ambientTrack: null,
      soundProfile: "classic-arcade"
    },

    visuals: {
      palette: "classic-nokia",
      background: "#9bbc0f",
      foreground: "#0f380f",
      accent: "#306230",
      secondaryAccent: "#8bac0f",
      gridEnabled: true,
      scanlinesEnabled: false,
      glowEnabled: false,
      particleEffects: false,
      vignetteEnabled: false,
      screenShakeEnabled: false,
      pixelatedRendering: true
    },

    gameplay: {
      defaultMode: "classic",
      wallCollision: "death",
      selfCollision: "death",
      wrapAround: false,
      obstaclesEnabled: false,
      initialSpeed: 5,
      speedMultiplier: 1.1,
      powerUpsEnabled: false,
      dynamicObstacles: false,
      comboScoring: false,
      classicGrid: true,
      gridColumns: 20,
      gridRows: 20
    },

    unlockRequirements: {
      type: "world-completion",
      worldId: "world-04"
    },

    rewards: {
      completionBonus: 2000,
      unlockAchievements: ["nokia-legend"],
      cosmeticUnlocks: ["classic-nokia-skin"]
    },

    metadata: {
      chapter: 5,
      era: "retro",
      tags: ["nokia", "classic", "retro", "pixel-art"],
      featured: true,
      nostalgic: true
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