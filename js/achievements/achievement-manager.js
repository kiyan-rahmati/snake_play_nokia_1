(function (global) {
  "use strict";

  class SnakeAchievementManager {
    constructor(options) {
      const settings = options || {};

      this.storageKey =
        settings.storageKey || "snake-achievements";
      this.definitions = new Map();
      this.progress = new Map();
      this.unlocked = new Map();
      this.listeners = new Set();
      this.destroyed = false;

      this.maxRecentUnlocks = Math.max(
        1,
        Math.floor(Number(settings.maxRecentUnlocks) || 20)
      );

      this.recentUnlocks = [];
      this._load();

      if (Array.isArray(settings.achievements)) {
        this.registerMany(settings.achievements);
      } else if (
        global.SnakeAchievementDefinitions &&
        Array.isArray(global.SnakeAchievementDefinitions)
      ) {
        this.registerMany(global.SnakeAchievementDefinitions);
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeAchievementManager has been destroyed.");
      }
    }

    _storage() {
      try {
        return global.localStorage || null;
      } catch (error) {
        return null;
      }
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

    _normalizeDefinition(definition) {
      if (!definition || typeof definition !== "object") {
        throw new TypeError("Achievement definition must be an object.");
      }

      const id =
        typeof definition.id === "string"
          ? definition.id.trim()
          : "";

      if (!id) {
        throw new TypeError("Achievement ID is required.");
      }

      return {
        id,
        title:
          typeof definition.title === "string"
            ? definition.title.slice(0, 100)
            : id,
        description:
          typeof definition.description === "string"
            ? definition.description.slice(0, 500)
            : "",
        category:
          typeof definition.category === "string"
            ? definition.category.slice(0, 60)
            : "general",
        icon:
          typeof definition.icon === "string"
            ? definition.icon.slice(0, 100)
            : "🏆",
        points: this._safeNumber(definition.points, 0),
        hidden: definition.hidden === true,
        repeatable: definition.repeatable === true,
        target: this._safeNumber(definition.target, 1, 1),
        metric:
          typeof definition.metric === "string"
            ? definition.metric.slice(0, 80)
            : id,
        condition:
          typeof definition.condition === "function"
            ? definition.condition
            : null,
        metadata: this._safeObject(definition.metadata)
      };
    }

    _safeNumber(value, fallback, minimum) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return fallback;
      }

      return Math.max(
        minimum === undefined ? 0 : minimum,
        Math.floor(number)
      );
    }

    _safeObject(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
      }

      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        return {};
      }
    }

    register(definition) {
      this._assertAlive();

      const normalized = this._normalizeDefinition(definition);
      const existing = this.definitions.get(normalized.id);

      this.definitions.set(normalized.id, normalized);

      if (!this.progress.has(normalized.id)) {
        this.progress.set(normalized.id, {
          current: 0,
          target: normalized.target,
          completed: false,
          updatedAt: null
        });
      } else {
        const current = this.progress.get(normalized.id);

        current.target = normalized.target;
        current.current = Math.min(
          current.current,
          normalized.target
        );
      }

      if (existing) {
        this._emit("definition-updated", {
          achievement: this._publicDefinition(normalized)
        });
      } else {
        this._emit("registered", {
          achievement: this._publicDefinition(normalized)
        });
      }

      this._save();

      return this.getDefinition(normalized.id);
    }

    registerMany(definitions) {
      this._assertAlive();

      if (!Array.isArray(definitions)) {
        throw new TypeError("Achievements must be an array.");
      }

      return definitions.map((definition) => this.register(definition));
    }

    unregister(id) {
      this._assertAlive();

      const existed = this.definitions.delete(id);

      if (!existed) {
        return false;
      }

      this._emit("unregistered", { id });
      return true;
    }

    _publicDefinition(definition) {
      return {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        category: definition.category,
        icon: definition.icon,
        points: definition.points,
        hidden: definition.hidden,
        repeatable: definition.repeatable,
        target: definition.target,
        metric: definition.metric,
        metadata: this._safeObject(definition.metadata)
      };
    }

    getDefinition(id) {
      this._assertAlive();

      const definition = this.definitions.get(id);

      return definition
        ? this._publicDefinition(definition)
        : null;
    }

    getDefinitions(options) {
      this._assertAlive();

      const settings = options || {};
      let definitions = Array.from(this.definitions.values());

      if (settings.category) {
        definitions = definitions.filter(
          (item) => item.category === settings.category
        );
      }

      if (settings.includeHidden !== true) {
        definitions = definitions.filter((item) => !item.hidden);
      }

      if (settings.unlocked === true) {
        definitions = definitions.filter(
          (item) => this.unlocked.has(item.id)
        );
      } else if (settings.unlocked === false) {
        definitions = definitions.filter(
          (item) => !this.unlocked.has(item.id)
        );
      }

      return definitions.map((item) => this._publicDefinition(item));
    }

    updateProgress(id, value, options) {
      this._assertAlive();

      const definition = this.definitions.get(id);

      if (!definition) {
        return {
          updated: false,
          reason: "unknown-achievement",
          achievement: null
        };
      }

      const settings = options || {};
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new TypeError("Progress must be a non-negative number.");
      }

      const previous = this.progress.get(id) || {
        current: 0,
        target: definition.target,
        completed: false,
        updatedAt: null
      };

      const currentValue = settings.increment === true
        ? previous.current + numericValue
        : numericValue;

      const nextValue = Math.min(
        definition.target,
        Math.floor(currentValue)
      );

      const next = {
        current: nextValue,
        target: definition.target,
        completed: nextValue >= definition.target,
        updatedAt: new Date().toISOString()
      };

      this.progress.set(id, next);

      let newlyUnlocked = false;

      if (next.completed && !this.unlocked.has(id)) {
        newlyUnlocked = this.unlock(id, settings);
      }

      this._save();

      this._emit("progress-updated", {
        id,
        previous: this._clone(previous),
        progress: this._clone(next),
        newlyUnlocked
      });

      return {
        updated: true,
        newlyUnlocked,
        progress: this._clone(next),
        achievement: this.get(id)
      };
    }

    incrementProgress(id, amount, options) {
      this._assertAlive();

      const incrementBy = Number(amount === undefined ? 1 : amount);

      if (!Number.isFinite(incrementBy) || incrementBy < 0) {
        throw new TypeError("Increment must be non-negative.");
      }

      const progress = this.progress.get(id);

      return this.updateProgress(
        id,
        (progress ? progress.current : 0) + incrementBy,
        {
          ...(options || {}),
          increment: false
        }
      );
    }

    unlock(id, options) {
      this._assertAlive();

      const definition = this.definitions.get(id);

      if (!definition) {
        return false;
      }

      if (this.unlocked.has(id) && !definition.repeatable) {
        return false;
      }

      const settings = options || {};
      const unlockedAt = new Date().toISOString();

      const record = {
        id: this._createId(),
        achievementId: id,
        title: definition.title,
        points: definition.points,
        unlockedAt,
        sessionId:
          typeof settings.sessionId === "string"
            ? settings.sessionId.slice(0, 100)
            : null,
        metadata: this._safeObject(settings.metadata)
      };

      if (!definition.repeatable || !this.unlocked.has(id)) {
        this.unlocked.set(id, record);
      }

      this.recentUnlocks.unshift(record);
      this.recentUnlocks = this.recentUnlocks.slice(
        0,
        this.maxRecentUnlocks
      );

      const progress = this.progress.get(id);

      if (progress) {
        progress.current = progress.target;
        progress.completed = true;
        progress.updatedAt = unlockedAt;
      }

      this._save();

      this._emit("unlocked", {
        achievement: this.get(id),
        record: this._clone(record)
      });

      return true;
    }

    get(id) {
      this._assertAlive();

      const definition = this.definitions.get(id);

      if (!definition) {
        return null;
      }

      const progress = this.progress.get(id) || {
        current: 0,
        target: definition.target,
        completed: false,
        updatedAt: null
      };

      const unlocked = this.unlocked.get(id) || null;

      return {
        ...this._publicDefinition(definition),
        progress: this._clone(progress),
        unlocked: Boolean(unlocked),
        unlockedAt: unlocked ? unlocked.unlockedAt : null,
        unlockRecord: unlocked ? this._clone(unlocked) : null,
        percentage: progress.target > 0
          ? Math.min(
              100,
              Math.round((progress.current / progress.target) * 100)
            )
          : 100
      };
    }

    getAll(options) {
      this._assertAlive();

      return this.getDefinitions({
        ...(options || {}),
        includeHidden: options && options.includeHidden === true
      }).map((definition) => this.get(definition.id));
    }

    getUnlocked(options) {
      this._assertAlive();

      const settings = options || {};
      let records = Array.from(this.unlocked.values());

      if (settings.category) {
        records = records.filter((record) => {
          const definition = this.definitions.get(record.achievementId);
          return definition && definition.category === settings.category;
        });
      }

      records.sort(
        (a, b) =>
          Date.parse(b.unlockedAt) - Date.parse(a.unlockedAt)
      );

      if (Number.isInteger(settings.limit) && settings.limit >= 0) {
        records = records.slice(0, settings.limit);
      }

      return records.map((record) => {
        const achievement = this.get(record.achievementId);

        return {
          ...record,
          achievement
        };
      });
    }

    getRecentUnlocks(limit) {
      this._assertAlive();

      const count = Number.isInteger(limit) && limit >= 0
        ? limit
        : this.maxRecentUnlocks;

      return this._clone(this.recentUnlocks.slice(0, count));
    }

    getStats() {
      this._assertAlive();

      let totalPoints = 0;
      let unlockedCount = 0;
      let hiddenCount = 0;

      for (const definition of this.definitions.values()) {
        if (definition.hidden) {
          hiddenCount += 1;
        }

        if (this.unlocked.has(definition.id)) {
          unlockedCount += 1;
          totalPoints += definition.points;
        }
      }

      const total = this.definitions.size;

      return {
        total,
        unlocked: unlockedCount,
        locked: Math.max(0, total - unlockedCount),
        hidden: hiddenCount,
        completionPercentage: total > 0
          ? Math.round((unlockedCount / total) * 100)
          : 0,
        totalPoints
      };
    }

    resetProgress(id) {
      this._assertAlive();

      if (id) {
        if (!this.definitions.has(id)) {
          return false;
        }

        const definition = this.definitions.get(id);

        this.progress.set(id, {
          current: 0,
          target: definition.target,
          completed: false,
          updatedAt: new Date().toISOString()
        });

        this.unlocked.delete(id);
        this.recentUnlocks = this.recentUnlocks.filter(
          (record) => record.achievementId !== id
        );
      } else {
        for (const definition of this.definitions.values()) {
          this.progress.set(definition.id, {
            current: 0,
            target: definition.target,
            completed: false,
            updatedAt: new Date().toISOString()
          });
        }

        this.unlocked.clear();
        this.recentUnlocks = [];
      }

      this._save();

      this._emit("progress-reset", {
        id: id || null
      });

      return true;
    }

    processEvent(eventName, payload) {
      this._assertAlive();

      const event = {
        name: String(eventName || ""),
        payload: payload && typeof payload === "object"
          ? payload
          : {},
        timestamp: new Date().toISOString()
      };

      const results = [];

      for (const definition of this.definitions.values()) {
        if (this.unlocked.has(definition.id) && !definition.repeatable) {
          continue;
        }

        if (!definition.condition) {
          continue;
        }

        try {
          const result = definition.condition(
            event,
            this.get(definition.id)
          );

          if (result === true) {
            results.push({
              id: definition.id,
              unlocked: this.unlock(definition.id, {
                sessionId: event.payload.sessionId,
                metadata: {
                  trigger: event.name
                }
              })
            });
          } else if (typeof result === "number" && result >= 0) {
            results.push({
              id: definition.id,
              progress: this.updateProgress(
                definition.id,
                result,
                {
                  sessionId: event.payload.sessionId
                }
              )
            });
          } else if (
            result &&
            typeof result === "object" &&
            Number.isFinite(Number(result.progress))
          ) {
            results.push({
              id: definition.id,
              progress: this.updateProgress(
                definition.id,
                Number(result.progress),
                {
                  sessionId: event.payload.sessionId
                }
              )
            });
          }
        } catch (error) {
          this._emit("condition-error", {
            id: definition.id,
            eventName: event.name,
            message: error && error.message
              ? error.message
              : "Achievement condition failed."
          });
        }
      }

      return results;
    }

    _load() {
      const storage = this._storage();

      if (!storage) {
        return;
      }

      try {
        const raw = storage.getItem(this.storageKey);

        if (!raw) {
          return;
        }

        const data = JSON.parse(raw);

        if (!data || typeof data !== "object") {
          return;
        }

        if (Array.isArray(data.progress)) {
          for (const entry of data.progress) {
            if (
              entry &&
              typeof entry.id === "string" &&
              entry.progress &&
              typeof entry.progress === "object"
            ) {
              this.progress.set(entry.id, {
                current: this._safeNumber(entry.progress.current, 0),
                target: this._safeNumber(entry.progress.target, 1, 1),
                completed: entry.progress.completed === true,
                updatedAt: entry.progress.updatedAt || null
              });
            }
          }
        }

        if (Array.isArray(data.unlocked)) {
          for (const record of data.unlocked) {
            if (
              record &&
              typeof record.achievementId === "string"
            ) {
              this.unlocked.set(record.achievementId, record);
            }
          }
        }

        if (Array.isArray(data.recentUnlocks)) {
          this.recentUnlocks = data.recentUnlocks
            .filter(
              (record) =>
                record &&
                typeof record.achievementId === "string"
            )
            .slice(0, this.maxRecentUnlocks);
        }
      } catch (error) {
        this.progress.clear();
        this.unlocked.clear();
        this.recentUnlocks = [];
      }
    }

    _save() {
      const storage = this._storage();

      if (!storage) {
        return false;
      }

      try {
        storage.setItem(
          this.storageKey,
          JSON.stringify({
            version: 1,
            updatedAt: new Date().toISOString(),
            progress: Array.from(this.progress.entries()).map(
              ([id, progress]) => ({
                id,
                progress
              })
            ),
            unlocked: Array.from(this.unlocked.values()),
            recentUnlocks: this.recentUnlocks
          })
        );

        return true;
      } catch (error) {
        this._emit("save-error", {
          message: "Unable to save achievements."
        });

        return false;
      }
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
          if (
            global.console &&
            typeof global.console.error === "function"
          ) {
            global.console.error(
              "[SnakeAchievementManager] Listener error:",
              error
            );
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("achievements:" + type, event);
      }
    }

    _clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this._save();
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeAchievementManager = SnakeAchievementManager;
})(window);