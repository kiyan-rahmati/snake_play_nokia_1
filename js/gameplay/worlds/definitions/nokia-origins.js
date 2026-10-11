(function (global) {
  "use strict";

  const world = {
    id: "world-01",
    name: "Nokia Origins",
    title: "Nokia Origins",
    description: "Return to the classic monochrome Nokia Snake experience.",

    order: 1,
    theme: "day",
    themeClass: "world-theme-nokia-origins",

    levelIds: ["001", "002", "003"],

    musicTrack: "assets/audio/music/nokia-origins.mp3",

    audio: {
      music: "assets/audio/music/nokia-origins.mp3",
      volume: 0.65,
      ambientEnabled: false
    },

    visuals: {
      palette: "classic-green",
      background: "#c7d6a3",
      foreground: "#263b20",
      accent: "#526d35",
      gridEnabled: true,
      scanlinesEnabled: false
    },

    gameplay: {
      defaultMode: "classic",
      wallCollision: "death",
      selfCollision: "death",
      wrapAround: false,
      obstaclesEnabled: true,
      initialSpeed: 5
    },

    unlockRequirements: {
      type: "always-unlocked"
    },

    rewards: {
      completionBonus: 300,
      unlockWorldIds: ["world-02"]
    },

    metadata: {
      chapter: 1,
      era: "classic",
      tags: ["nokia", "retro", "classic-snake"],
      featured: true
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