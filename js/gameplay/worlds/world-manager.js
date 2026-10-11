(function (global) {
  "use strict";

  let currentWorld = null;
  let previousWorld = null;
  let switching = false;
  let transitionToken = 0;

  function getRegistry() {
    return global.SnakeWorldRegistry;
  }

  function setWorld(worldId, options = {}) {
    if (switching) {
      throw new Error("A world transition is already in progress.");
    }

    const registry = getRegistry();

    if (!registry || typeof registry.get !== "function") {
      throw new Error("SnakeWorldRegistry is not available.");
    }

    const world = registry.get(worldId);

    if (!world) {
      throw new Error("World not found: " + worldId);
    }

    if (currentWorld && currentWorld.id === world.id) {
      return currentWorld;
    }

    switching = true;
    const token = ++transitionToken;
    previousWorld = currentWorld;

    try {
      emit("snake:world-changing", {
        from: previousWorld ? previousWorld.id : null,
        to: world.id,
        token
      });

      currentWorld = world;

      if (options.applyTheme !== false) {
        applyTheme(world);
      }

      emit("snake:world-changed", {
        world: currentWorld,
        previousWorld,
        token
      });

      return currentWorld;
    } catch (error) {
      currentWorld = previousWorld;
      emit("snake:world-change-error", {
        worldId: world.id,
        error,
        token
      });
      throw error;
    } finally {
      switching = false;
    }
  }

  function applyTheme(world) {
    if (!world) {
      return;
    }

    const themeId = world.theme || world.id;
    const root = global.document.documentElement;

    root.dataset.world = world.id;
    root.dataset.worldTheme = themeId;

    if (world.themeClass) {
      root.classList.remove(
        "world-theme-nokia-origins",
        "world-theme-pixel-rush",
        "world-theme-snake-maze",
        "world-theme-neon-overdrive",
        "world-theme-nokia-legend"
      );

      root.classList.add(world.themeClass);
    }
  }

  function getCurrentWorld() {
    return currentWorld;
  }

  function getPreviousWorld() {
    return previousWorld;
  }

  function getWorldLevelIds() {
    return currentWorld ? [...currentWorld.levelIds] : [];
  }

  function isSwitching() {
    return switching;
  }

  function getTransitionToken() {
    return transitionToken;
  }

  function reset(options = {}) {
    const oldWorld = currentWorld;

    currentWorld = null;
    previousWorld = null;
    transitionToken += 1;

    if (options.resetTheme !== false) {
      const root = global.document.documentElement;
      delete root.dataset.world;
      delete root.dataset.worldTheme;

      root.classList.remove(
        "world-theme-nokia-origins",
        "world-theme-pixel-rush",
        "world-theme-snake-maze",
        "world-theme-neon-overdrive",
        "world-theme-nokia-legend"
      );
    }

    emit("snake:world-reset", {
      previousWorld: oldWorld,
      token: transitionToken
    });
  }

  function emit(name, detail) {
    global.dispatchEvent(new CustomEvent(name, { detail }));
  }

  global.SnakeWorldManager = Object.freeze({
    setWorld,
    getCurrentWorld,
    getPreviousWorld,
    getWorldLevelIds,
    isSwitching,
    getTransitionToken,
    reset
  });
})(window);