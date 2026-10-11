(function (global) {
  "use strict";

  const CURRENT_VERSION = 1;

  const DEFAULT_SAVE = {
    version: CURRENT_VERSION,
    profile: {
      name: "Player",
      createdAt: null,
      lastPlayedAt: null
    },
    progress: {
      totalGames: 0,
      totalScore: 0,
      totalFood: 0,
      totalPlayTime: 0,
      highestLevel: 1,
      highestWorld: 1,
      unlockedLevels: [1],
      unlockedWorlds: [1]
    },
    records: {
      highScore: 0,
      longestGame: 0,
      mostFoodInGame: 0,
      bestScores: []
    },
    achievements: {
      unlocked: [],
      progress: {},
      updatedAt: null
    },
    settings: {
      theme: "day",
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 0.7,
      musicVolume: 0.5,
      controlMode: "keyboard",
      vibrationEnabled: true,
      reducedMotion: false,
      language: "en"
    },
    session: {
      lastSessionId: null,
      lastLevelId: null,
      lastWorldId: null,
      lastScore: 0,
      lastResult: null
    },
    history: {
      sessions: []
    },
    metadata: {
      createdAt: null,
      updatedAt: null,
      checksum: null
    }
  };

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDefaults(defaultValue, inputValue) {
    if (Array.isArray(defaultValue)) {
      return Array.isArray(inputValue) ? clone(inputValue) : clone(defaultValue);
    }

    if (isObject(defaultValue)) {
      const input = isObject(inputValue) ? inputValue : {};
      const result = {};

      Object.keys(defaultValue).forEach((key) => {
        result[key] = mergeDefaults(defaultValue[key], input[key]);
      });

      Object.keys(input).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(result, key)) {
          result[key] = clone(input[key]);
        }
      });

      return result;
    }

    return inputValue === undefined ? defaultValue : inputValue;
  }

  function normalizeNumber(value, fallback, minimum, maximum) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, number));
  }

  function normalizeString(value, fallback, maxLength) {
    if (typeof value !== "string") {
      return fallback;
    }

    const normalized = value.trim();

    if (!normalized) {
      return fallback;
    }

    return normalized.slice(0, maxLength);
  }

  function normalizeUniquePositiveIntegers(values, fallback) {
    if (!Array.isArray(values)) {
      return clone(fallback);
    }

    const result = [];
    const seen = new Set();

    values.forEach((value) => {
      const number = Number(value);

      if (
        Number.isInteger(number) &&
        number > 0 &&
        !seen.has(number)
      ) {
        seen.add(number);
        result.push(number);
      }
    });

    return result;
  }

  function normalizeTimestamp(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }

    if (typeof value !== "string") {
      return null;
    }

    const timestamp = Date.parse(value);

    return Number.isFinite(timestamp)
      ? new Date(timestamp).toISOString()
      : null;
  }

  function normalizeSettings(settings) {
    const result = mergeDefaults(DEFAULT_SAVE.settings, settings);

    result.theme = ["day", "night"].includes(result.theme)
      ? result.theme
      : "day";

    result.language = normalizeString(result.language, "en", 10);

    result.controlMode = [
      "keyboard",
      "touch",
      "mixed"
    ].includes(result.controlMode)
      ? result.controlMode
      : "keyboard";

    result.soundEnabled = Boolean(result.soundEnabled);
    result.musicEnabled = Boolean(result.musicEnabled);
    result.vibrationEnabled = Boolean(result.vibrationEnabled);
    result.reducedMotion = Boolean(result.reducedMotion);

    result.soundVolume = normalizeNumber(
      result.soundVolume,
      0.7,
      0,
      1
    );

    result.musicVolume = normalizeNumber(
      result.musicVolume,
      0.5,
      0,
      1
    );

    return result;
  }

  function normalizeBestScores(scores) {
    if (!Array.isArray(scores)) {
      return [];
    }

    return scores
      .filter((entry) => isObject(entry))
      .map((entry) => ({
        score: normalizeNumber(entry.score, 0, 0, Number.MAX_SAFE_INTEGER),
        levelId: normalizeNumber(entry.levelId, 1, 1, Number.MAX_SAFE_INTEGER),
        worldId: normalizeNumber(entry.worldId, 1, 1, Number.MAX_SAFE_INTEGER),
        duration: normalizeNumber(entry.duration, 0, 0, Number.MAX_SAFE_INTEGER),
        food: normalizeNumber(entry.food, 0, 0, Number.MAX_SAFE_INTEGER),
        achievedAt: normalizeTimestamp(entry.achievedAt)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }

  function normalizeHistory(sessions) {
    if (!Array.isArray(sessions)) {
      return [];
    }

    return sessions
      .filter((session) => isObject(session))
      .map((session) => ({
        id: normalizeString(session.id, "", 128),
        startedAt: normalizeTimestamp(session.startedAt),
        endedAt: normalizeTimestamp(session.endedAt),
        score: normalizeNumber(session.score, 0, 0, Number.MAX_SAFE_INTEGER),
        food: normalizeNumber(session.food, 0, 0, Number.MAX_SAFE_INTEGER),
        duration: normalizeNumber(session.duration, 0, 0, Number.MAX_SAFE_INTEGER),
        levelId: normalizeNumber(session.levelId, 1, 1, Number.MAX_SAFE_INTEGER),
        worldId: normalizeNumber(session.worldId, 1, 1, Number.MAX_SAFE_INTEGER),
        result: normalizeString(session.result, "unknown", 40)
      }))
      .slice(-500);
  }

  function normalizeSave(input) {
    const source = isObject(input) ? input : {};
    const save = mergeDefaults(DEFAULT_SAVE, source);

    save.version = CURRENT_VERSION;

    save.profile.name = normalizeString(
      save.profile.name,
      "Player",
      40
    );

    save.profile.createdAt = normalizeTimestamp(save.profile.createdAt);
    save.profile.lastPlayedAt = normalizeTimestamp(save.profile.lastPlayedAt);

    save.progress.totalGames = normalizeNumber(
      save.progress.totalGames,
      0,
      0,
      Number.MAX_SAFE_INTEGER
    );

    save.progress.totalScore = normalizeNumber(
      save.progress.totalScore,
      0,
      0,
      Number.MAX_SAFE_INTEGER
    );

    save.progress.totalFood = normalizeNumber(
      save.progress.totalFood,
      0,
      0,
      Number.MAX_SAFE_INTEGER
    );

    save.progress.totalPlayTime = normalizeNumber(
      save.progress.totalPlayTime,
      0,
      0,
      Number.MAX_SAFE_INTEGER
    );

    save.progress.highestLevel = normalizeNumber(
      save.progress.highestLevel,
      1,
      1,
      Number.MAX_SAFE_INTEGER
    );

    save.progress.highestWorld = normalizeNumber(
      save.progress.highestWorld,
      1,
      1,
      Number.MAX_SAFE_INTEGER
    );

    save.progress.unlockedLevels = normalizeUniquePositiveIntegers(
      save.progress.unlockedLevels,
      [1]
    );

    save.progress.unlockedWorlds = normalizeUniquePositiveIntegers(
      save.progress.unlockedWorlds,
      [1]
    );

    if (!save.progress.unlockedLevels.includes(1)) {
      save.progress.unlockedLevels.unshift(1);
    }

    if (!save.progress.unlockedWorlds.includes(1)) {
      save.progress.unlockedWorlds.unshift(1);
    }

    save.records.highScore = normalizeNumber(
      save.records.highScore,
      0,
      0,
      Number.MAX_SAFE_INTEGER
    );

    save.records.longestGame = normalizeNumber(
      save.records.longestGame,
      0,
      0,
      Number.MAX_SAFE_INTEGER
    );

    save.records.mostFoodInGame = normalizeNumber(
      save.records.mostFoodInGame,
      0,
      0,
      Number.MAX_SAFE_INTEGER
    );

    save.records.bestScores = normalizeBestScores(
      save.records.bestScores
    );

    save.achievements.unlocked = Array.isArray(save.achievements.unlocked)
      ? Array.from(
          new Set(
            save.achievements.unlocked.filter(
              (id) => typeof id === "string" && id.trim()
            )
          )
        )
      : [];

    save.achievements.progress = isObject(save.achievements.progress)
      ? save.achievements.progress
      : {};

    save.achievements.updatedAt = normalizeTimestamp(
      save.achievements.updatedAt
    );

    save.settings = normalizeSettings(save.settings);

    save.session.lastSessionId = normalizeString(
      save.session.lastSessionId,
      "",
      128
    ) || null;

    save.session.lastLevelId = save.session.lastLevelId === null
      ? null
      : normalizeNumber(save.session.lastLevelId, 1, 1, Number.MAX_SAFE_INTEGER);

    save.session.lastWorldId = save.session.lastWorldId === null
      ? null
      : normalizeNumber(save.session.lastWorldId, 1, 1, Number.MAX_SAFE_INTEGER);

    save.session.lastScore = normalizeNumber(
      save.session.lastScore,
      0,
      0,
      Number.MAX_SAFE_INTEGER
    );

    save.session.lastResult = normalizeString(
      save.session.lastResult,
      "",
      40
    ) || null;

    save.history.sessions = normalizeHistory(save.history.sessions);

    save.metadata.createdAt = normalizeTimestamp(save.metadata.createdAt);
    save.metadata.updatedAt = normalizeTimestamp(save.metadata.updatedAt);
    save.metadata.checksum = normalizeString(
      save.metadata.checksum,
      "",
      256
    ) || null;

    return save;
  }

  function validateSave(input) {
    const errors = [];

    if (!isObject(input)) {
      return {
        valid: false,
        errors: ["Save data must be an object."]
      };
    }

    if (!Number.isInteger(input.version) || input.version < 1) {
      errors.push("Invalid save version.");
    }

    if (!isObject(input.profile)) {
      errors.push("Missing profile data.");
    }

    if (!isObject(input.progress)) {
      errors.push("Missing progress data.");
    }

    if (!isObject(input.records)) {
      errors.push("Missing records data.");
    }

    if (!isObject(input.settings)) {
      errors.push("Missing settings data.");
    }

    if (!isObject(input.metadata)) {
      errors.push("Missing metadata.");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  const SnakeSaveSchema = {
    version: CURRENT_VERSION,

    createDefault(overrides) {
      const save = clone(DEFAULT_SAVE);
      const now = new Date().toISOString();

      save.profile.createdAt = now;
      save.metadata.createdAt = now;
      save.metadata.updatedAt = now;

      return normalizeSave(
        mergeDefaults(save, overrides || {})
      );
    },

    normalize: normalizeSave,

    validate: validateSave,

    clone,

    getDefault() {
      return clone(DEFAULT_SAVE);
    },

    getVersion() {
      return CURRENT_VERSION;
    }
  };

  global.SnakeSaveSchema = SnakeSaveSchema;
})(window);