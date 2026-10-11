(function (global) {
  "use strict";

  const levels = new Map();

  function normalizeId(id) {
    if (typeof id === "number" && Number.isInteger(id) && id > 0) {
      return String(id).padStart(3, "0");
    }

    if (typeof id === "string" && id.trim()) {
      return id.trim().replace(/^level-/i, "").padStart(3, "0");
    }

    throw new TypeError("Invalid level ID.");
  }

  function register(level) {
    if (!level || typeof level !== "object") {
      throw new TypeError("Level definition must be an object.");
    }

    const id = normalizeId(level.id);

    if (levels.has(id)) {
      throw new Error("Level already registered: " + id);
    }

    const definition = Object.freeze({
      ...level,
      id,
      obstacles: Object.freeze([...(level.obstacles || [])]),
      objectives: Object.freeze([...(level.objectives || [])]),
      metadata: Object.freeze({ ...(level.metadata || {}) })
    });

    levels.set(id, definition);

    return definition;
  }

  function get(id) {
    return levels.get(normalizeId(id)) || null;
  }

  function has(id) {
    try {
      return levels.has(normalizeId(id));
    } catch {
      return false;
    }
  }

  function unregister(id) {
    return levels.delete(normalizeId(id));
  }

  function getAll() {
    return Array.from(levels.values()).sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true })
    );
  }

  function getIds() {
    return getAll().map((level) => level.id);
  }

  function getCount() {
    return levels.size;
  }

  function clear() {
    levels.clear();
  }

  global.SnakeLevelRegistry = Object.freeze({
    register,
    get,
    has,
    unregister,
    getAll,
    getIds,
    getCount,
    clear,
    normalizeId
  });
})(window);