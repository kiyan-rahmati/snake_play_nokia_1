(function (global) {
  "use strict";

  const STORAGE_KEY = "snake-v2-unlocked-levels";
  const DEFAULT_LEVEL = "001";

  const unlockedLevels = new Set([DEFAULT_LEVEL]);

  function normalizeId(id) {
    if (typeof id === "number" && Number.isInteger(id) && id > 0) {
      return String(id).padStart(3, "0");
    }

    if (typeof id === "string" && id.trim()) {
      return id.trim().replace(/^level-/i, "").padStart(3, "0");
    }

    throw new TypeError("Invalid level ID.");
  }

  function unlock(id) {
    const levelId = normalizeId(id);

    if (unlockedLevels.has(levelId)) {
      return false;
    }

    unlockedLevels.add(levelId);
    persist();

    emit("snake:level-unlocked", { levelId });

    return true;
  }

  function lock(id) {
    const levelId = normalizeId(id);

    if (levelId === DEFAULT_LEVEL || !unlockedLevels.has(levelId)) {
      return false;
    }

    unlockedLevels.delete(levelId);
    persist();

    emit("snake:level-locked", { levelId });

    return true;
  }

  function isUnlocked(id) {
    try {
      return unlockedLevels.has(normalizeId(id));
    } catch {
      return false;
    }
  }

  function getUnlockedLevels() {
    return Array.from(unlockedLevels).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }

  function unlockNext(id) {
    const currentId = Number(normalizeId(id));

    if (!Number.isSafeInteger(currentId)) {
      return null;
    }

    const nextId = String(currentId + 1).padStart(3, "0");
    const registry = global.SnakeLevelRegistry;

    if (registry && !registry.has(nextId)) {
      return null;
    }

    unlock(nextId);
    return nextId;
  }

  function saveProgress(completedLevelId) {
    const levelId = normalizeId(completedLevelId);
    unlock(levelId);

    const nextLevelId = unlockNext(levelId);

    emit("snake:level-progress-saved", {
      completedLevelId: levelId,
      nextLevelId,
      unlockedLevels: getUnlockedLevels()
    });

    return {
      completedLevelId: levelId,
      nextLevelId,
      unlockedLevels: getUnlockedLevels()
    };
  }

  function persist() {
    try {
      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(getUnlockedLevels())
      );
    } catch (error) {
      emit("snake:level-progress-save-error", { error });
    }
  }

  function restore() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return getUnlockedLevels();
      }

      const saved = JSON.parse(raw);

      if (!Array.isArray(saved)) {
        return getUnlockedLevels();
      }

      unlockedLevels.clear();
      unlockedLevels.add(DEFAULT_LEVEL);

      saved.forEach((id) => {
        try {
          unlockedLevels.add(normalizeId(id));
        } catch {
          // Ignore invalid saved IDs.
        }
      });

      return getUnlockedLevels();
    } catch (error) {
      emit("snake:level-progress-restore-error", { error });
      return getUnlockedLevels();
    }
  }

  function reset() {
    unlockedLevels.clear();
    unlockedLevels.add(DEFAULT_LEVEL);
    persist();

    emit("snake:level-progress-reset", {
      unlockedLevels: getUnlockedLevels()
    });

    return getUnlockedLevels();
  }

  function emit(name, detail) {
    global.dispatchEvent(new CustomEvent(name, { detail }));
  }

  restore();

  global.SnakeLevelUnlockManager = Object.freeze({
    unlock,
    lock,
    isUnlocked,
    getUnlockedLevels,
    unlockNext,
    saveProgress,
    restore,
    reset,
    DEFAULT_LEVEL
  });
})(window);