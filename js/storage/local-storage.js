(function (global) {
  "use strict";

  class SnakeLocalStorage {
    constructor(options) {
      const settings = options || {};

      this.prefix = settings.prefix || "snake-game:";
      this.version = Number(settings.version) || 1;
      this.fallbackToMemory = settings.fallbackToMemory !== false;
      this.memory = new Map();
      this.listeners = new Set();
      this.destroyed = false;
      this.storage = this._resolveStorage();
      this.available = Boolean(this.storage);
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeLocalStorage has been destroyed.");
      }
    }

    _resolveStorage() {
      try {
        const storage = global.localStorage;
        const testKey = this.prefix + "__availability_test__";

        storage.setItem(testKey, "1");
        storage.removeItem(testKey);

        return storage;
      } catch (error) {
        return null;
      }
    }

    _getKey(key) {
      if (typeof key !== "string" || !key.trim()) {
        throw new TypeError("A valid storage key is required.");
      }

      return this.prefix + key.trim();
    }

    _serialize(value) {
      const serialized = JSON.stringify(value);

      if (typeof serialized !== "string") {
        throw new TypeError("Value cannot be serialized.");
      }

      return serialized;
    }

    _parse(value, fallback) {
      if (value === null || value === undefined) {
        return fallback;
      }

      try {
        return JSON.parse(value);
      } catch (error) {
        return fallback;
      }
    }

    _clone(value) {
      if (value === undefined) {
        return undefined;
      }

      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        return value;
      }
    }

    _emit(type, details) {
      const event = {
        type,
        details: details || {},
        timestamp: Date.now()
      };

      this.listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error("[SnakeLocalStorage]", error);
          }
        }
      });
    }

    _readRaw(key) {
      const fullKey = this._getKey(key);

      if (this.storage) {
        try {
          const value = this.storage.getItem(fullKey);

          if (value !== null) {
            return value;
          }
        } catch (error) {
          this._emit("error", {
            operation: "read",
            key,
            message: error.message
          });
        }
      }

      return this.fallbackToMemory && this.memory.has(fullKey)
        ? this.memory.get(fullKey)
        : null;
    }

    _writeRaw(key, value) {
      const fullKey = this._getKey(key);
      let persisted = false;

      if (this.storage) {
        try {
          this.storage.setItem(fullKey, value);
          persisted = true;
        } catch (error) {
          this._emit("error", {
            operation: "write",
            key,
            message: error.message
          });
        }
      }

      if (!persisted && this.fallbackToMemory) {
        this.memory.set(fullKey, value);
      }

      return persisted || this.fallbackToMemory;
    }

    get(key, fallback) {
      this._assertAlive();

      const raw = this._readRaw(key);
      const defaultValue = fallback === undefined ? null : fallback;

      return this._clone(this._parse(raw, defaultValue));
    }

    set(key, value) {
      this._assertAlive();

      const serialized = this._serialize(value);
      const persisted = this._writeRaw(key, serialized);

      this._emit("set", {
        key,
        persisted
      });

      return {
        success: persisted,
        persisted,
        key
      };
    }

    has(key) {
      this._assertAlive();
      return this._readRaw(key) !== null;
    }

    remove(key) {
      this._assertAlive();

      const fullKey = this._getKey(key);
      let persisted = true;

      if (this.storage) {
        try {
          this.storage.removeItem(fullKey);
        } catch (error) {
          persisted = false;
        }
      }

      this.memory.delete(fullKey);

      this._emit("remove", {
        key,
        persisted
      });

      return {
        success: persisted || this.fallbackToMemory,
        persisted,
        key
      };
    }

    clear() {
      this._assertAlive();

      const removed = [];
      const prefix = this.prefix;

      if (this.storage) {
        try {
          const keys = [];

          for (let index = 0; index < this.storage.length; index += 1) {
            const key = this.storage.key(index);

            if (key && key.startsWith(prefix)) {
              keys.push(key);
            }
          }

          keys.forEach((key) => {
            removed.push(key.slice(prefix.length));
            this.storage.removeItem(key);
          });
        } catch (error) {
          this._emit("error", {
            operation: "clear",
            message: error.message
          });
        }
      }

      for (const key of this.memory.keys()) {
        if (key.startsWith(prefix)) {
          removed.push(key.slice(prefix.length));
          this.memory.delete(key);
        }
      }

      this._emit("clear", {
        removed: Array.from(new Set(removed))
      });

      return {
        success: true,
        removed: Array.from(new Set(removed))
      };
    }

    keys() {
      this._assertAlive();

      const result = new Set();
      const prefix = this.prefix;

      if (this.storage) {
        try {
          for (let index = 0; index < this.storage.length; index += 1) {
            const key = this.storage.key(index);

            if (key && key.startsWith(prefix)) {
              result.add(key.slice(prefix.length));
            }
          }
        } catch (error) {
          this._emit("error", {
            operation: "keys",
            message: error.message
          });
        }
      }

      if (this.fallbackToMemory) {
        for (const key of this.memory.keys()) {
          if (key.startsWith(prefix)) {
            result.add(key.slice(prefix.length));
          }
        }
      }

      return Array.from(result);
    }

    getMany(keys, fallback) {
      this._assertAlive();

      if (!Array.isArray(keys)) {
        throw new TypeError("Keys must be an array.");
      }

      return keys.reduce((result, key) => {
        result[key] = this.get(key, fallback);
        return result;
      }, {});
    }

    setMany(entries) {
      this._assertAlive();

      if (
        !entries ||
        typeof entries !== "object" ||
        Array.isArray(entries)
      ) {
        throw new TypeError("Entries must be an object.");
      }

      const prepared = Object.entries(entries).map(([key, value]) => ({
        key,
        serialized: this._serialize(value)
      }));

      const results = prepared.map((entry) => {
        const persisted = this._writeRaw(entry.key, entry.serialized);

        return {
          key: entry.key,
          success: persisted,
          persisted
        };
      });

      this._emit("set-many", {
        count: results.length
      });

      return {
        success: results.every((result) => result.success),
        results
      };
    }

    update(key, updater, fallback) {
      this._assertAlive();

      if (typeof updater !== "function") {
        throw new TypeError("Updater must be a function.");
      }

      const current = this.get(key, fallback);
      const updated = updater(this._clone(current));
      const result = this.set(key, updated);

      return {
        ...result,
        value: this._clone(updated)
      };
    }

    exportData() {
      this._assertAlive();

      const data = {};

      this.keys().forEach((key) => {
        data[key] = this.get(key, null);
      });

      return {
        format: "snake-local-storage",
        version: this.version,
        exportedAt: new Date().toISOString(),
        data
      };
    }

    importData(payload, options) {
      this._assertAlive();

      if (
        !payload ||
        typeof payload !== "object" ||
        !payload.data ||
        typeof payload.data !== "object" ||
        Array.isArray(payload.data)
      ) {
        throw new TypeError("Invalid import payload.");
      }

      const settings = options || {};
      const imported = [];
      const skipped = [];

      Object.entries(payload.data).forEach(([key, value]) => {
        if (settings.overwrite === false && this.has(key)) {
          skipped.push(key);
          return;
        }

        try {
          const result = this.set(key, value);

          if (result.success) {
            imported.push(key);
          } else {
            skipped.push(key);
          }
        } catch (error) {
          skipped.push(key);
        }
      });

      this._emit("import", {
        imported,
        skipped
      });

      return {
        success: skipped.length === 0,
        imported,
        skipped
      };
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

    getInfo() {
      this._assertAlive();

      return {
        available: this.available,
        fallbackToMemory: this.fallbackToMemory,
        prefix: this.prefix,
        version: this.version,
        keyCount: this.keys().length,
        memoryKeyCount: this.memory.size
      };
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.listeners.clear();
      this.memory.clear();
      this.destroyed = true;
    }
  }

  global.SnakeLocalStorage = SnakeLocalStorage;
})(window);