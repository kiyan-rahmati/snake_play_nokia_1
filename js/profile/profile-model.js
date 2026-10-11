(function (global) {
  "use strict";

  const DEFAULT_PROFILE = Object.freeze({
    id: null,
    username: "",
    displayName: "",
    avatar: null,
    bio: "",
    createdAt: null,
    updatedAt: null,

    statistics: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalScore: 0,
      highestScore: 0,
      totalFoodCollected: 0,
      totalPlayTime: 0,
      longestSnake: 0,
      worldsCompleted: 0,
      levelsCompleted: 0
    },

    preferences: {
      theme: "day",
      soundEnabled: true,
      musicEnabled: true,
      language: "en",
      reducedMotion: false
    }
  });

  class ProfileModel {
    constructor(initialData) {
      this._listeners = new Set();
      this._profile = this._normalize(initialData || {});
    }

    _normalize(data) {
      const now = new Date().toISOString();

      return {
        ...DEFAULT_PROFILE,
        ...data,

        id: data.id ?? null,
        username: this._sanitizeText(data.username, 24),
        displayName: this._sanitizeText(
          data.displayName || data.username,
          40
        ),
        avatar: typeof data.avatar === "string" ? data.avatar : null,
        bio: this._sanitizeText(data.bio, 160),
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,

        statistics: {
          ...DEFAULT_PROFILE.statistics,
          ...(data.statistics || {})
        },

        preferences: {
          ...DEFAULT_PROFILE.preferences,
          ...(data.preferences || {})
        }
      };
    }

    _sanitizeText(value, maxLength) {
      if (typeof value !== "string") {
        return "";
      }

      return value
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, maxLength);
    }

    getProfile() {
      return this._clone(this._profile);
    }

    get(field) {
      if (!Object.prototype.hasOwnProperty.call(this._profile, field)) {
        return undefined;
      }

      return this._clone(this._profile[field]);
    }

    update(fields) {
      if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
        throw new TypeError("Profile updates must be an object.");
      }

      const protectedFields = ["statistics", "createdAt", "id"];

      for (const field of protectedFields) {
        if (Object.prototype.hasOwnProperty.call(fields, field)) {
          throw new Error(`Cannot directly update profile field: ${field}`);
        }
      }

      const nextData = {
        ...this._profile,
        ...fields,
        updatedAt: new Date().toISOString()
      };

      if (fields.preferences) {
        nextData.preferences = {
          ...this._profile.preferences,
          ...fields.preferences
        };
      }

      this._profile = this._normalize(nextData);
      this._emit("updated");

      return this.getProfile();
    }

    updateStatistics(changes) {
      if (!changes || typeof changes !== "object") {
        throw new TypeError("Statistics updates must be an object.");
      }

      const nextStatistics = { ...this._profile.statistics };

      for (const [key, value] of Object.entries(changes)) {
        if (!Object.prototype.hasOwnProperty.call(nextStatistics, key)) {
          continue;
        }

        if (typeof value !== "number" || !Number.isFinite(value)) {
          continue;
        }

        nextStatistics[key] = Math.max(0, value);
      }

      this._profile = {
        ...this._profile,
        statistics: nextStatistics,
        updatedAt: new Date().toISOString()
      };

      this._emit("statistics-updated");

      return this.get("statistics");
    }

    incrementStatistic(key, amount) {
      if (!Object.prototype.hasOwnProperty.call(
        this._profile.statistics,
        key
      )) {
        return false;
      }

      const increment = Number(amount);

      if (!Number.isFinite(increment)) {
        return false;
      }

      const current = this._profile.statistics[key];

      this._profile.statistics[key] = Math.max(
        0,
        current + increment
      );

      this._profile.updatedAt = new Date().toISOString();
      this._emit("statistics-updated");

      return this._profile.statistics[key];
    }

    setPreference(key, value) {
      if (!Object.prototype.hasOwnProperty.call(
        DEFAULT_PROFILE.preferences,
        key
      )) {
        return false;
      }

      this._profile.preferences[key] = value;
      this._profile.updatedAt = new Date().toISOString();

      this._emit("preferences-updated");

      return true;
    }

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener must be a function.");
      }

      this._listeners.add(listener);

      return () => {
        this._listeners.delete(listener);
      };
    }

    reset() {
      const createdAt = this._profile.createdAt;

      this._profile = this._normalize({
        createdAt,
        updatedAt: new Date().toISOString()
      });

      this._emit("reset");

      return this.getProfile();
    }

    toJSON() {
      return this.getProfile();
    }

    _emit(eventName) {
      const snapshot = this.getProfile();

      for (const listener of this._listeners) {
        try {
          listener({
            type: eventName,
            profile: snapshot
          });
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error("Profile listener failed:", error);
          }
        }
      }
    }

    _clone(value) {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }

      return JSON.parse(JSON.stringify(value));
    }
  }

  global.SnakeProfileModel = ProfileModel;
  global.SnakeProfileDefaults = DEFAULT_PROFILE;
})(window);