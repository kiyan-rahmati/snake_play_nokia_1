(function (global) {
  "use strict";

  class SnakeHighScoreManager {
    constructor(options) {
      const settings = options || {};

      this.recordManager =
        settings.recordManager ||
        (global.SnakeRecordManager
          ? new global.SnakeRecordManager()
          : null);

      this.storageKey = settings.storageKey || "snake-high-scores";
      this.maxEntries = Math.max(
        1,
        Math.floor(Number(settings.maxEntries) || 10)
      );

      this.listeners = new Set();
      this.destroyed = false;
      this.cache = [];
      this.unsubscribeRecords = null;

      if (this.recordManager) {
        this.unsubscribeRecords = this.recordManager.subscribe(() => {
          this.refresh();
        });
      }

      this.refresh();
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeHighScoreManager has been destroyed.");
      }
    }

    _resolveStorage() {
      try {
        return global.localStorage || null;
      } catch (error) {
        return null;
      }
    }

    _normalizeEntry(entry, index) {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const score = Number(entry.score);

      if (!Number.isFinite(score) || score < 0) {
        return null;
      }

      const level = Number(entry.level);
      const duration = Number(entry.duration);

      return {
        id:
          typeof entry.id === "string" && entry.id
            ? entry.id
            : "high-score-" + index,
        score: Math.floor(score),
        playerName:
          typeof entry.playerName === "string"
            ? entry.playerName.trim().slice(0, 40) || "Player"
            : "Player",
        mode:
          typeof entry.mode === "string"
            ? entry.mode.slice(0, 40)
            : "classic",
        world:
          typeof entry.world === "string"
            ? entry.world.slice(0, 80)
            : "default",
        level:
          Number.isFinite(level) && level >= 1
            ? Math.floor(level)
            : 1,
        duration:
          Number.isFinite(duration) && duration >= 0
            ? Math.floor(duration)
            : 0,
        createdAt: this._normalizeDate(entry.createdAt)
      };
    }

    _normalizeDate(value) {
      const timestamp =
        typeof value === "string" ? Date.parse(value) : NaN;

      return Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : new Date().toISOString();
    }

    _sort(entries) {
      return entries.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        if (b.level !== a.level) {
          return b.level - a.level;
        }

        if (a.duration !== b.duration) {
          return a.duration - b.duration;
        }

        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      });
    }

    refresh() {
      this._assertAlive();

      let entries = [];

      if (this.recordManager) {
        try {
          entries = this.recordManager
            .getAll({ sortBy: "score" })
            .map((record, index) =>
              this._normalizeEntry(record, index)
            )
            .filter(Boolean);
        } catch (error) {
          entries = [];
        }
      } else {
        entries = this._loadFallback();
      }

      const unique = new Map();

      for (const entry of entries) {
        const key = entry.mode + ":" + entry.id;

        if (!unique.has(key)) {
          unique.set(key, entry);
        }
      }

      this.cache = this._sort(Array.from(unique.values())).slice(
        0,
        this.maxEntries
      );

      this._saveFallback();
      this._emit("refreshed", {
        count: this.cache.length
      });

      return this.getAll();
    }

    _loadFallback() {
      const storage = this._resolveStorage();

      if (!storage) {
        return [];
      }

      try {
        const raw = storage.getItem(this.storageKey);

        if (!raw) {
          return [];
        }

        const payload = JSON.parse(raw);

        if (!payload || !Array.isArray(payload.entries)) {
          return [];
        }

        return payload.entries
          .map((entry, index) => this._normalizeEntry(entry, index))
          .filter(Boolean);
      } catch (error) {
        return [];
      }
    }

    _saveFallback() {
      if (this.recordManager) {
        return false;
      }

      const storage = this._resolveStorage();

      if (!storage) {
        return false;
      }

      try {
        storage.setItem(
          this.storageKey,
          JSON.stringify({
            version: 1,
            updatedAt: new Date().toISOString(),
            entries: this.cache
          })
        );

        return true;
      } catch (error) {
        return false;
      }
    }

    submit(data) {
      this._assertAlive();

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new TypeError("High-score data must be an object.");
      }

      const score = Number(data.score);

      if (!Number.isFinite(score) || score < 0) {
        throw new TypeError("Score must be a non-negative number.");
      }

      let entry;

      if (this.recordManager) {
        const record = this.recordManager.addRecord({
          score: Math.floor(score),
          playerName: data.playerName || "Player",
          mode: data.mode || "classic",
          world: data.world || "default",
          level: data.level || 1,
          duration: data.duration || 0,
          completed: data.completed === true,
          metadata: data.metadata || {}
        });

        entry = this._normalizeEntry(record, 0);
      } else {
        entry = this._normalizeEntry(
          {
            ...data,
            id: this._createId(),
            score: Math.floor(score),
            createdAt: new Date().toISOString()
          },
          0
        );

        if (!entry) {
          throw new TypeError("Invalid high-score entry.");
        }

        this.cache.push(entry);
        this._sort(this.cache);
        this.cache = this.cache.slice(0, this.maxEntries);
        this._saveFallback();
      }

      this.refresh();

      const rank = this.getRank(entry.id, entry.mode);

      this._emit("submitted", {
        entry: this._clone(entry),
        rank,
        isTopScore: rank === 1
      });

      return {
        entry: this._clone(entry),
        rank,
        isTopScore: rank === 1,
        qualifies: rank > 0 && rank <= this.maxEntries
      };
    }

    _createId() {
      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        return global.crypto.randomUUID();
      }

      return (
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10)
      );
    }

    getAll(options) {
      this._assertAlive();

      const settings = options || {};
      let entries = this.cache.map((entry) => this._clone(entry));

      if (settings.mode) {
        entries = entries.filter(
          (entry) => entry.mode === settings.mode
        );
      }

      if (settings.world) {
        entries = entries.filter(
          (entry) => entry.world === settings.world
        );
      }

      if (Number.isInteger(settings.limit) && settings.limit >= 0) {
        entries = entries.slice(0, settings.limit);
      }

      return entries;
    }

    getTop(limit, options) {
      this._assertAlive();

      const count = Number.isInteger(limit) && limit >= 0
        ? limit
        : this.maxEntries;

      return this.getAll({
        ...(options || {}),
        limit: count
      });
    }

    getBest(options) {
      this._assertAlive();

      const entries = this.getAll({
        ...(options || {}),
        limit: 1
      });

      return entries.length ? entries[0] : null;
    }

    getRank(id, mode) {
      this._assertAlive();

      const entries = this.getAll({ mode });
      const index = entries.findIndex((entry) => entry.id === id);

      return index === -1 ? -1 : index + 1;
    }

    isHighScore(score, options) {
      this._assertAlive();

      const value = Number(score);

      if (!Number.isFinite(value) || value < 0) {
        return false;
      }

      const settings = options || {};
      const entries = this.getAll({
        mode: settings.mode,
        limit: this.maxEntries
      });

      if (entries.length < this.maxEntries) {
        return true;
      }

      return value > entries[entries.length - 1].score;
    }

    getLowestScore(options) {
      this._assertAlive();

      const entries = this.getAll({
        ...(options || {}),
        limit: this.maxEntries
      });

      return entries.length
        ? entries[entries.length - 1].score
        : null;
    }

    clear(options) {
      this._assertAlive();

      if (this.recordManager) {
        this.recordManager.clear(options || {});
        this.refresh();
        return true;
      }

      const settings = options || {};

      if (settings.mode) {
        this.cache = this.cache.filter(
          (entry) => entry.mode !== settings.mode
        );
      } else {
        this.cache = [];
      }

      this._saveFallback();
      this._emit("cleared", {
        mode: settings.mode || null
      });

      return true;
    }

    subscribe(listener) {
      this._assertAlive();

      if (typeof listener !== "function") {
        throw new TypeError("Listener must be a function.");
      }

      this.listeners.add(listener);

      return () => {
        this.listeners.delete(listener);
      };
    }

    _emit(type, details) {
      const event = {
        type,
        details: details || null,
        timestamp: new Date().toISOString()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error(
              "[SnakeHighScoreManager] Listener error:",
              error
            );
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("highscores:" + type, event);
      }
    }

    _clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    exportData(options) {
      this._assertAlive();

      return JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          entries: this.getAll(options || {})
        },
        null,
        2
      );
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (typeof this.unsubscribeRecords === "function") {
        this.unsubscribeRecords();
      }

      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeHighScoreManager = SnakeHighScoreManager;
})(window);