(function (global) {
  "use strict";

  class SnakePersonalBests {
    constructor(options) {
      const settings = options || {};

      this.storageKey = settings.storageKey || "snake-personal-bests";
      this.storageVersion = 1;
      this.listeners = new Set();
      this.destroyed = false;

      this.categories = [
        "score",
        "level",
        "duration",
        "foodEaten",
        "survival",
        "worldsCompleted"
      ];

      this.records = this._load();
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakePersonalBests has been destroyed.");
      }
    }

    _getStorage() {
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

    _normalizeMode(mode) {
      return typeof mode === "string" && mode.trim()
        ? mode.trim().slice(0, 40)
        : "classic";
    }

    _normalizeWorld(world) {
      return typeof world === "string" && world.trim()
        ? world.trim().slice(0, 80)
        : "default";
    }

    _normalizeRecord(record, index) {
      if (!record || typeof record !== "object") {
        return null;
      }

      const category = String(record.category || "");
      const value = Number(record.value);

      if (
        !this.categories.includes(category) ||
        !Number.isFinite(value) ||
        value < 0
      ) {
        return null;
      }

      return {
        id:
          typeof record.id === "string" && record.id
            ? record.id
            : "personal-best-" + index,
        category,
        value: Math.floor(value),
        mode: this._normalizeMode(record.mode),
        world: this._normalizeWorld(record.world),
        source:
          typeof record.source === "string"
            ? record.source.slice(0, 80)
            : "game",
        achievedAt: this._normalizeDate(record.achievedAt),
        sessionId:
          typeof record.sessionId === "string"
            ? record.sessionId.slice(0, 100)
            : null,
        metadata: this._safeObject(record.metadata)
      };
    }

    _normalizeDate(value) {
      const timestamp = Date.parse(value || "");

      return Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : new Date().toISOString();
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

    _load() {
      const storage = this._getStorage();

      if (!storage) {
        return [];
      }

      try {
        const raw = storage.getItem(this.storageKey);

        if (!raw) {
          return [];
        }

        const parsed = JSON.parse(raw);
        const entries = Array.isArray(parsed)
          ? parsed
          : parsed && Array.isArray(parsed.records)
            ? parsed.records
            : [];

        const unique = new Map();

        entries.forEach((record, index) => {
          const normalized = this._normalizeRecord(record, index);

          if (normalized) {
            const key = this._key(
              normalized.category,
              normalized.mode,
              normalized.world
            );

            const existing = unique.get(key);

            if (
              !existing ||
              this._isBetter(normalized.category, normalized.value, existing.value)
            ) {
              unique.set(key, normalized);
            }
          }
        });

        return Array.from(unique.values());
      } catch (error) {
        return [];
      }
    }

    _key(category, mode, world) {
      return [
        category,
        this._normalizeMode(mode),
        this._normalizeWorld(world)
      ].join("::");
    }

    _isBetter(category, candidate, current) {
      if (category === "duration") {
        return candidate > current;
      }

      return candidate > current;
    }

    _save() {
      const storage = this._getStorage();

      if (!storage) {
        return false;
      }

      try {
        storage.setItem(
          this.storageKey,
          JSON.stringify({
            version: this.storageVersion,
            updatedAt: new Date().toISOString(),
            records: this.records
          })
        );

        return true;
      } catch (error) {
        this._emit("save-error", {
          message: "Unable to save personal bests."
        });

        return false;
      }
    }

    set(category, value, options) {
      this._assertAlive();

      if (!this.categories.includes(category)) {
        throw new TypeError("Unsupported personal-best category.");
      }

      const numericValue = Number(value);

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        throw new TypeError("Personal-best value must be non-negative.");
      }

      const settings = options || {};
      const mode = this._normalizeMode(settings.mode);
      const world = this._normalizeWorld(settings.world);
      const normalizedValue = Math.floor(numericValue);
      const key = this._key(category, mode, world);

      const index = this.records.findIndex(
        (record) =>
          this._key(record.category, record.mode, record.world) === key
      );

      const current = index >= 0 ? this.records[index] : null;

      if (
        current &&
        !this._isBetter(category, normalizedValue, current.value)
      ) {
        return {
          updated: false,
          record: this._clone(current),
          previousValue: current.value,
          value: current.value
        };
      }

      const record = {
        id: this._createId(),
        category,
        value: normalizedValue,
        mode,
        world,
        source:
          typeof settings.source === "string"
            ? settings.source.slice(0, 80)
            : "game",
        achievedAt: new Date().toISOString(),
        sessionId:
          typeof settings.sessionId === "string"
            ? settings.sessionId.slice(0, 100)
            : null,
        metadata: this._safeObject(settings.metadata)
      };

      const previousValue = current ? current.value : null;

      if (index >= 0) {
        this.records[index] = record;
      } else {
        this.records.push(record);
      }

      this._save();

      this._emit("record-updated", {
        record: this._clone(record),
        previousValue,
        isFirst: current === null
      });

      return {
        updated: true,
        record: this._clone(record),
        previousValue,
        value: normalizedValue
      };
    }

    updateFromSession(session) {
      this._assertAlive();

      if (!session || typeof session !== "object") {
        throw new TypeError("Session data must be an object.");
      }

      const settings = {
        mode: session.mode,
        world: session.world,
        sessionId: session.id,
        source: "session",
        metadata: {
          status: session.status || "completed"
        }
      };

      const results = {};

      for (const category of this.categories) {
        let value;

        switch (category) {
          case "score":
            value = session.score;
            break;
          case "level":
            value = session.level;
            break;
          case "duration":
          case "survival":
            value = session.duration;
            break;
          case "foodEaten":
            value = session.foodEaten;
            break;
          case "worldsCompleted":
            value = session.worldsCompleted;
            break;
          default:
            continue;
        }

        if (value === undefined || value === null) {
          continue;
        }

        results[category] = this.set(category, value, settings);
      }

      return results;
    }

    get(category, options) {
      this._assertAlive();

      const settings = options || {};
      const mode = settings.mode
        ? this._normalizeMode(settings.mode)
        : null;
      const world = settings.world
        ? this._normalizeWorld(settings.world)
        : null;

      let records = this.records.filter(
        (record) => record.category === category
      );

      if (mode) {
        records = records.filter((record) => record.mode === mode);
      }

      if (world) {
        records = records.filter((record) => record.world === world);
      }

      if (!records.length) {
        return null;
      }

      records.sort((a, b) => {
        if (b.value !== a.value) {
          return b.value - a.value;
        }

        return Date.parse(a.achievedAt) - Date.parse(b.achievedAt);
      });

      return this._clone(records[0]);
    }

    getAll(options) {
      this._assertAlive();

      const settings = options || {};
      let records = this.records.map((record) => this._clone(record));

      if (settings.category) {
        records = records.filter(
          (record) => record.category === settings.category
        );
      }

      if (settings.mode) {
        records = records.filter(
          (record) =>
            record.mode === this._normalizeMode(settings.mode)
        );
      }

      if (settings.world) {
        records = records.filter(
          (record) =>
            record.world === this._normalizeWorld(settings.world)
        );
      }

      if (settings.sortBy === "date") {
        records.sort(
          (a, b) =>
            Date.parse(b.achievedAt) - Date.parse(a.achievedAt)
        );
      } else {
        records.sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }

          return b.value - a.value;
        });
      }

      if (Number.isInteger(settings.limit) && settings.limit >= 0) {
        records = records.slice(0, settings.limit);
      }

      return records;
    }

    hasRecord(category, options) {
      this._assertAlive();

      return this.get(category, options) !== null;
    }

    getValue(category, options) {
      const record = this.get(category, options);

      return record ? record.value : null;
    }

    getSummary(options) {
      this._assertAlive();

      const summary = {};

      for (const category of this.categories) {
        summary[category] = this.get(category, options);
      }

      return summary;
    }

    reset(category, options) {
      this._assertAlive();

      const settings = options || {};
      const before = this.records.length;

      this.records = this.records.filter((record) => {
        if (category && record.category !== category) {
          return true;
        }

        if (
          settings.mode &&
          record.mode !== this._normalizeMode(settings.mode)
        ) {
          return true;
        }

        if (
          settings.world &&
          record.world !== this._normalizeWorld(settings.world)
        ) {
          return true;
        }

        return false;
      });

      const removed = before - this.records.length;

      if (removed > 0) {
        this._save();

        this._emit("records-reset", {
          category: category || null,
          removed
        });
      }

      return removed;
    }

    exportData(options) {
      this._assertAlive();

      return JSON.stringify(
        {
          version: this.storageVersion,
          exportedAt: new Date().toISOString(),
          records: this.getAll(options || {})
        },
        null,
        2
      );
    }

    importData(input, options) {
      this._assertAlive();

      let parsed;

      try {
        parsed = typeof input === "string" ? JSON.parse(input) : input;
      } catch (error) {
        throw new TypeError("Invalid personal-best data.");
      }

      const incoming = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.records)
          ? parsed.records
          : null;

      if (!incoming) {
        throw new TypeError("Personal-best data must contain records.");
      }

      const settings = options || {};
      const imported = incoming
        .map((record, index) => this._normalizeRecord(record, index))
        .filter(Boolean);

      if (settings.replace === true) {
        this.records = [];
      }

      for (const record of imported) {
        const key = this._key(
          record.category,
          record.mode,
          record.world
        );

        const index = this.records.findIndex(
          (existing) =>
            this._key(
              existing.category,
              existing.mode,
              existing.world
            ) === key
        );

        if (index === -1) {
          this.records.push(record);
        } else if (
          this._isBetter(
            record.category,
            record.value,
            this.records[index].value
          )
        ) {
          this.records[index] = record;
        }
      }

      this._save();

      this._emit("records-imported", {
        count: imported.length
      });

      return this.getAll();
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
              "[SnakePersonalBests] Listener error:",
              error
            );
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("personal-bests:" + type, event);
      }
    }

    _clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakePersonalBests = SnakePersonalBests;
})(window);