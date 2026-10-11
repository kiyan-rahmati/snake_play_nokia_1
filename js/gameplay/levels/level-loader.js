(function (global) {
  "use strict";

  const registry = () => global.SnakeLevelRegistry;

  let currentLevel = null;
  let loadToken = 0;

  function load(id) {
    const levelRegistry = registry();

    if (!levelRegistry || typeof levelRegistry.get !== "function") {
      throw new Error("SnakeLevelRegistry is not available.");
    }

    const level = levelRegistry.get(id);

    if (!level) {
      throw new Error("Level not found: " + id);
    }

    loadToken += 1;
    currentLevel = level;

    global.dispatchEvent(
      new CustomEvent("snake:level-loaded", {
        detail: {
          level,
          token: loadToken
        }
      })
    );

    return level;
  }

  function getCurrent() {
    return currentLevel;
  }

  function isLoaded() {
    return currentLevel !== null;
  }

  function unload() {
    const previousLevel = currentLevel;

    currentLevel = null;
    loadToken += 1;

    if (previousLevel) {
      global.dispatchEvent(
        new CustomEvent("snake:level-unloaded", {
          detail: {
            level: previousLevel,
            token: loadToken
          }
        })
      );
    }

    return previousLevel;
  }

  function getLoadToken() {
    return loadToken;
  }

  global.SnakeLevelLoader = Object.freeze({
    load,
    getCurrent,
    isLoaded,
    unload,
    getLoadToken
  });
})(window);