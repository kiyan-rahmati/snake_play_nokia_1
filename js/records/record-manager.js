(function (global) {
  "use strict";

  const STORAGE_KEY = "snake-game-records";
  const SCHEMA_VERSION = 1;

  class SnakeRecordManager {
    constructor(options) {
      const settings = options || {};

      this.storageKey = settings.storageKey || STORAGE_KEY;
      this.storage = this._resolveStorage(settings.storage);
      this.maxRecords = Math.max(
        1,
        Math.floor(Number(settings.maxRecords) || 100)
      );

      this.records = [];
      this.listeners = new Set();
      this.destroyed = false;
      this.sequence = 0;

      if (settings.autoLoad !== false) {
        this.load();
      }
    }

    _resolveStorage(storage) {
      if (storage !== undefined) {
        return storage;
      }

      try {
        return global.localStorage || null;
      } catch (error) {
        return null;
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeRecordManager has been destroyed.");
      }
    }

    _createId() {
      this.sequence += 1;

      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        return global.crypto.randomUUID();
      }

      return (
        Date.now().toString(36) +
        "-" +
        this.sequence.toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10)
      );
    }

    load() {
      this._assertAlive();

      let payload = null;

      try {
        const raw = this.storage
          ? this.storage.getItem(this.storageKey)
          : null;

        if (raw) {
          payload = JSON.parse(raw);
        }
      } catch (error) {
        payload = null;
      }

      if (
        payload &&
        payload.version === SCHEMA_VERSION &&
        Array.isArray(payload.records)
      ) {
        this.records = payload.records
          .map((record) => this._normalizeRecord(record))
          .filter(Boolean)
          .slice(0, this.maxRecords);
      } else {
        this.records = [];
      }

      this._emit("loaded", {
        count: this.records.length
      });

      return this.getAll();
    }

    _normalizeRecord(record) {
      if (!record || typeof record !== "object") {
        return null;
      }

      const score = Number(record.score);

      if (!Number.isFinite(score) || score < 0) {
        return null;
      }

      const duration = Number(record.duration);
      const level = Number(record.level);

      return {
        id:
          typeof record.id === "string" && record.id
            ? record.id
            : this._createId(),
        score: Math.floor(score),
        duration:
          Number.isFinite(duration) && duration >= 0
            ? Math.floor(duration)
            : 0,
        level:
          Number.isFinite(level) && level >= 1
            ? Math.floor(level)
            : 1,
        world:
          typeof record.world === "string"
            ? record.world.slice(0, 80)
            : "default",
        playerName:
          typeof record.playerName === "string"
            ? record.playerName.trim().slice(0, 40)
            : "Player",
        mode:
          typeof record.mode === "string"
            ? record.mode.slice(0, 40)
            : "classic",
        completed: record.completed === true,
        createdAt: this._normalizeDate(record.createdAt),
        metadata:
          record.metadata &&
          typeof record.metadata === "object" &&
          !Array.isArray(record.metadata)
            ? this._safeMetadata(record.metadata)
            : {}
      };
    }

    _normalizeDate(value) {
      if (typeof value !== "string") {
        return new Date().toISOString();
      }

      const timestamp = Date.parse(value);

      return Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : new Date().toISOString();
    }

    _safeMetadata(metadata) {
      const safe = {};
      const allowedKeys = [
        "foodEaten",
        "moves",
        "worldId",
        "levelId",
        "difficulty"
      ];

      for (const key of allowedKeys) {
        const value = metadata[key];

        if (
          typeof value === "string" ||
          typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value))
        ) {
          safe[key] =
            typeof value === "string" ? value.slice(0, 80) : value;
        }
      }

      return safe;
    }

    addRecord(data) {
      this._assertAlive();

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new TypeError("Record data must be an object.");
      }

      const record = this._normalizeRecord({
        ...data,
        id: this._createId(),
        createdAt: new Date().toISOString()
      });

      if (!record) {
        throw new TypeError("Invalid record data.");
      }

      this.records.unshift(record);
      this.records = this.records.slice(0, this.maxRecords);

      this.save();

      this._emit("added", {
        record: this._clone(record),
        count: this.records.length
      });

      return this._clone(record);
    }

    getAll(options) {
      this._assertAlive();

      const settings = options || {};
      let records = this.records.map((record) => this._clone(record));

      if (settings.mode) {
        records = records.filter(
          (record) => record.mode === settings.mode
        );
      }

      if (settings.world) {
        records = records.filter(
          (record) => record.world === settings.world
        );
      }

      if (settings.completed !== undefined) {
        records = records.filter(
          (record) => record.completed === Boolean(settings.completed)
        );
      }

      if (settings.sortBy === "score") {
        records.sort((a, b) => b.score - a.score);
      } else if (settings.sortBy === "duration") {
        records.sort((a, b) => b.duration - a.duration);
      } else if (settings.sortBy === "level") {
        records.sort((a, b) => b.level - a.level);
      } else {
        records.sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
        );
      }

      if (Number.isInteger(settings.limit) && settings.limit >= 0) {
        records = records.slice(0, settings.limit);
      }

      return records;
    }

    getById(id) {
      this._assertAlive();

      const record = this.records.find((item) => item.id === id);

      return record ? this._clone(record) : null;
    }

    getBest(options) {
      this._assertAlive();

      const records = this.getAll({
        ...(options || {}),
        sortBy: "score",
        limit: 1
      });

      return records.length ? records[0] : null;
    }

    getCount() {
      this._assertAlive();
      return this.records.length;
    }

    removeRecord(id) {
      this._assertAlive();

      const index = this.records.findIndex((record) => record.id === id);

      if (index === -1) {
        return false;
      }

      const removed = this.records.splice(index, 1)[0];

      this.save();

      this._emit("removed", {
        record: this._clone(removed),
        count: this.records.length
      });

      return true;
    }

    clear(options) {
      this._assertAlive();

      const settings = options || {};
      const previousCount = this.records.length;

      if (settings.mode) {
        this.records = this.records.filter(
          (record) => record.mode !== settings.mode
        );
      } else {
        this.records = [];
      }

      this.save();

      this._emit("cleared", {
        previousCount,
        count: this.records.length,
        mode: settings.mode || null
      });

      return true;
    }

    save() {
      this._assertAlive();

      if (!this.storage) {
        return false;
      }

      try {
        this.storage.setItem(
          this.storageKey,
          JSON.stringify({
            version: SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            records: this.records
          })
        );

        return true;
      } catch (error) {
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
        count: this.records.length,
        timestamp: new Date().toISOString()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error(
              "[SnakeRecordManager] Listener error:",
              error
            );
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("records:" + type, event);
      }
    }

    _clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    exportData() {
      this._assertAlive();

      return JSON.stringify(
        {
          version: SCHEMA_VERSION,
          exportedAt: new Date().toISOString(),
          records: this.getAll()
        },
        null,
        2
      );
    }

    importData(json, options) {
      this._assertAlive();

      const settings = options || {};
      let payload;

      try {
        payload = typeof json === "string" ? JSON.parse(json) : json;
      } catch (error) {
        throw new TypeError("Invalid records JSON.");
      }

      if (!payload || !Array.isArray(payload.records)) {
        throw new TypeError("Invalid records data structure.");
      }

      const imported = payload.records
        .map((record) => this._normalizeRecord(record))
        .filter(Boolean);

      if (settings.replace === true) {
        this.records = imported.slice(0, this.maxRecords);
      } else {
        const existingIds = new Set(
          this.records.map((record) => record.id)
        );

        for (const record of imported) {
          if (existingIds.has(record.id)) {
            record.id = this._createId();
          }

          existingIds.add(record.id);
          this.records.push(record);
        }

        this.records = this.records.slice(0, this.maxRecords);
      }

      this.save();

      this._emit("imported", {
        importedCount: imported.length,
        count: this.records.length
      });

      return this.getAll();
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeRecordManager = SnakeRecordManager;
})(window);