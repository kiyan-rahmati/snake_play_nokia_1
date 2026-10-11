(function (global) {
  "use strict";

  class SnakeStorageAdapter {
    constructor(options) {
      const settings = options || {};

      this.prefix = settings.prefix || "snake-game:";
      this.version = Number(settings.version) || 1;
      this.defaultDriver = settings.driver || "localStorage";
      this.memory = new Map();
      this.listeners = new Set();
      this.destroyed = false;
      this.maxValueSize = Number(settings.maxValueSize) || 5 * 1024 * 1024;

      this.storage = this._resolveStorage(this.defaultDriver);
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeStorageAdapter has been destroyed.");
      }
    }

    _resolveStorage(driver) {
      if (driver === "memory") {
        return null;
      }

      if (driver === "sessionStorage") {
        try {
          return global.sessionStorage || null;
        } catch (error) {
          return null;
        }
      }

      try {
        return global.localStorage || null;
      } catch (error) {
        return null;
      }
    }

    _key(key) {
      if (typeof key !== "string" || !key.trim()) {
        throw new TypeError("A non-empty storage key is required.");
      }

      return this.prefix + key.trim();
    }

    _serialize(value) {
      let serialized;

      try {
        serialized = JSON.stringify(value);
      } catch (error) {
        throw new TypeError("The value cannot be serialized.");
      }

      if (typeof serialized !== "string") {
        throw new TypeError("The value cannot be serialized.");
      }

      if (serialized.length > this.maxValueSize) {
        throw new RangeError("The serialized value exceeds the size limit.");
      }

      return serialized;
    }

    _deserialize(value, fallback) {
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
        timestamp: new Date().toISOString()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error(
              "[SnakeStorageAdapter] Listener error:",
              error
            );
          }
        }
      }
    }

    _getMemory(key) {
      return this.memory.has(key) ? this.memory.get(key) : null;
    }

    _setMemory(key, value) {
      this.memory.set(key, value);
    }

    _removeMemory(key) {
      this.memory.delete(key);
    }

    _readRaw(key) {
      const fullKey = this._key(key);

      if (this.defaultDriver === "memory" || !this.storage) {
        return this._getMemory(fullKey);
      }

      try {
        return this.storage.getItem(fullKey);
      } catch (error) {
        this._emit("read-error", {
          key,
          message: error.message
        });

        return this._getMemory(fullKey);
      }
    }

    _writeRaw(key, value) {
      const fullKey = this._key(key);

      if (this.defaultDriver === "memory" || !this.storage) {
        this._setMemory(fullKey, value);
        return true;
      }

      try {
        this.storage.setItem(fullKey, value);
        this._setMemory(fullKey, value);
        return true;
      } catch (error) {
        this._emit("write-error", {
          key,
          message: error.message
        });

        this._setMemory(fullKey, value);
        return false;
      }
    }

    get(key, fallback) {
      this._assertAlive();

      const raw = this._readRaw(key);

      if (raw === null) {
        return fallback === undefined ? null : this._clone(fallback);
      }

      return this._clone(this._deserialize(raw, fallback));
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
        success: true,
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

      const fullKey = this._key(key);
      let persisted = true;

      if (this.storage && this.defaultDriver !== "memory") {
        try {
          this.storage.removeItem(fullKey);
        } catch (error) {
          persisted = false;
        }
      }

      this._removeMemory(fullKey);

      this._emit("remove", {
        key,
        persisted
      });

      return {
        success: true,
        persisted,
        key
      };
    }

    clear(options) {
      this._assertAlive();

      const settings = options || {};
      const removed = [];
      const prefix = this.prefix;

      if (settings.all === true) {
        if (this.storage && this.defaultDriver !== "memory") {
          try {
            this.storage.clear();
          } catch (error) {
            this._emit("clear-error", {
              message: error.message
            });
          }
        }

        this.memory.clear();

        this._emit("clear", {
          all: true,
          removed
        });

        return {
          success: true,
          removed
        };
      }

      if (this.storage && this.defaultDriver !== "memory") {
        try {
          const keys = [];

          for (let index = 0; index < this.storage.length; index += 1) {
            const storageKey = this.storage.key(index);

            if (storageKey && storageKey.startsWith(prefix)) {
              keys.push(storageKey);
            }
          }

          for (const storageKey of keys) {
            this.storage.removeItem(storageKey);
            removed.push(storageKey.slice(prefix.length));
          }
        } catch (error) {
          this._emit("clear-error", {
            message: error.message
          });
        }
      }

      for (const storageKey of this.memory.keys()) {
        if (storageKey.startsWith(prefix)) {
          removed.push(storageKey.slice(prefix.length));
          this.memory.delete(storageKey);
        }
      }

      this._emit("clear", {
        all: false,
        removed
      });

      return {
        success: true,
        removed: Array.from(new Set(removed))
      };
    }

    keys() {
      this._assertAlive();

      const keys = new Set();
      const prefix = this.prefix;

      if (this.storage && this.defaultDriver !== "memory") {
        try {
          for (let index = 0; index < this.storage.length; index += 1) {
            const storageKey = this.storage.key(index);

            if (storageKey && storageKey.startsWith(prefix)) {
              keys.add(storageKey.slice(prefix.length));
            }
          }
        } catch (error) {
          this._emit("keys-error", {
            message: error.message
          });
        }
      }

      for (const storageKey of this.memory.keys()) {
        if (storageKey.startsWith(prefix)) {
          keys.add(storageKey.slice(prefix.length));
        }
      }

      return Array.from(keys);
    }

    getMany(keys, options) {
      this._assertAlive();

      if (!Array.isArray(keys)) {
        throw new TypeError("Keys must be an array.");
      }

      const settings = options || {};
      const result = {};

      for (const key of keys) {
        result[key] = this.get(
          key,
          settings.fallback === undefined ? null : settings.fallback
        );
      }

      return result;
    }

    setMany(entries) {
      this._assertAlive();

      if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
        throw new TypeError("Entries must be an object.");
      }

      const prepared = [];

      for (const [key, value] of Object.entries(entries)) {
        prepared.push({
          key,
          serialized: this._serialize(value)
        });
      }

      const results = [];

      for (const entry of prepared) {
        results.push({
          key: entry.key,
          ...this._writeResult(entry.key, entry.serialized)
        });
      }

      this._emit("set-many", {
        count: results.length
      });

      return {
        success: results.every((result) => result.success),
        results
      };
    }

    _writeResult(key, serialized) {
      const persisted = this._writeRaw(key, serialized);

      return {
        success: true,
        persisted
      };
    }

    exportData(options) {
      this._assertAlive();

      const settings = options || {};
      const exported = {};

      for (const key of this.keys()) {
        if (
          Array.isArray(settings.exclude) &&
          settings.exclude.includes(key)
        ) {
          continue;
        }

        exported[key] = this.get(key, null);
      }

      return {
        format: "snake-storage-export",
        version: this.version,
        exportedAt: new Date().toISOString(),
        data: exported
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
        throw new TypeError("Invalid storage import payload.");
      }

      const settings = options || {};
      const entries = payload.data;
      const imported = [];
      const skipped = [];

      for (const [key, value] of Object.entries(entries)) {
        if (settings.overwrite === false && this.has(key)) {
          skipped.push(key);
          continue;
        }

        try {
          this.set(key, value);
          imported.push(key);
        } catch (error) {
          skipped.push(key);
        }
      }

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
        driver: this.defaultDriver,
        storageAvailable: Boolean(this.storage),
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
      this.destroyed = true;
    }
  }

  global.SnakeStorageAdapter = SnakeStorageAdapter;
})(window);