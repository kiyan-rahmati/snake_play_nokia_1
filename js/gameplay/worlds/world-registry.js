(function (global) {
  "use strict";

  const worlds = new Map();

  function normalizeId(id) {
    if (typeof id !== "string" || !id.trim()) {
      throw new TypeError("World ID must be a non-empty string.");
    }

    return id.trim().toLowerCase();
  }

  function register(world) {
    if (!world || typeof world !== "object" || Array.isArray(world)) {
      throw new TypeError("World definition must be an object.");
    }

    const id = normalizeId(world.id);

    if (worlds.has(id)) {
      throw new Error("World already registered: " + id);
    }

    const definition = Object.freeze({
      ...world,
      id,
      levelIds: Object.freeze(
        Array.isArray(world.levelIds) ? [...world.levelIds] : []
      ),
      metadata: Object.freeze({ ...(world.metadata || {}) })
    });

    worlds.set(id, definition);

    global.dispatchEvent(
      new CustomEvent("snake:world-registered", {
        detail: { world: definition }
      })
    );

    return definition;
  }

  function get(id) {
    try {
      return worlds.get(normalizeId(id)) || null;
    } catch {
      return null;
    }
  }

  function has(id) {
    try {
      return worlds.has(normalizeId(id));
    } catch {
      return false;
    }
  }

  function getAll() {
    return Array.from(worlds.values()).sort((a, b) => {
      const orderA = Number(a.order) || 0;
      const orderB = Number(b.order) || 0;
      return orderA - orderB || a.id.localeCompare(b.id);
    });
  }

  function getIds() {
    return getAll().map((world) => world.id);
  }

  function getCount() {
    return worlds.size;
  }

  function unregister(id) {
    const normalizedId = normalizeId(id);
    const world = worlds.get(normalizedId);

    if (!world) {
      return false;
    }

    worlds.delete(normalizedId);

    global.dispatchEvent(
      new CustomEvent("snake:world-unregistered", {
        detail: { world }
      })
    );

    return true;
  }

  function clear() {
    worlds.clear();
  }

  global.SnakeWorldRegistry = Object.freeze({
    register,
    get,
    has,
    getAll,
    getIds,
    getCount,
    unregister,
    clear,
    normalizeId
  });
})(window);