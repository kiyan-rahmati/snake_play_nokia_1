(function (global) {
  "use strict";

  class SnakeBackupManager {
    constructor(options) {
      const settings = options || {};

      this.storage = settings.storage || null;
      this.storageKey = settings.storageKey || "backups";
      this.maxBackups = Number.isInteger(settings.maxBackups)
        ? Math.max(1, settings.maxBackups)
        : 10;

      this.maxBackupSize = Number(settings.maxBackupSize) || 5 * 1024 * 1024;
      this.autoBackup = settings.autoBackup !== false;
      this.listeners = new Set();
      this.destroyed = false;
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeBackupManager has been destroyed.");
      }
    }

    _clone(value) {
      if (value === undefined) {
        return undefined;
      }

      return JSON.parse(JSON.stringify(value));
    }

    _serialize(value) {
      const serialized = JSON.stringify(value);

      if (typeof serialized !== "string") {
        throw new TypeError("Backup data cannot be serialized.");
      }

      if (serialized.length > this.maxBackupSize) {
        throw new RangeError("Backup data exceeds the configured size limit.");
      }

      return serialized;
    }

    _emit(type, details) {
      const event = {
        type,
        details: details || {},
        timestamp: new Date().toISOString()
      };

      this.listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error("[SnakeBackupManager]", error);
          }
        }
      });
    }

    _getBackups() {
      if (!this.storage) {
        return [];
      }

      try {
        const backups = this.storage.get(this.storageKey, []);

        return Array.isArray(backups) ? backups : [];
      } catch (error) {
        this._emit("error", {
          operation: "read",
          message: error.message
        });

        return [];
      }
    }

    _saveBackups(backups) {
      if (!this.storage) {
        return false;
      }

      try {
        const result = this.storage.set(this.storageKey, backups);

        return result === true ||
          Boolean(result && result.success !== false);
      } catch (error) {
        this._emit("error", {
          operation: "write",
          message: error.message
        });

        return false;
      }
    }

    _createId() {
      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        return global.crypto.randomUUID();
      }

      return [
        Date.now().toString(36),
        Math.random().toString(36).slice(2, 12)
      ].join("-");
    }

    _createBackupRecord(data, metadata) {
      const timestamp = new Date().toISOString();

      return {
        id: this._createId(),
        createdAt: timestamp,
        version: 1,
        reason: metadata.reason || "manual",
        description: metadata.description || "",
        data: this._clone(data),
        size: this._serialize(data).length
      };
    }

    createBackup(data, options) {
      this._assertAlive();

      if (data === undefined) {
        throw new TypeError("Backup data is required.");
      }

      const metadata = options || {};
      const backup = this._createBackupRecord(data, metadata);
      const backups = this._getBackups();

      backups.push(backup);

      const trimmed = backups
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
        .slice(-this.maxBackups);

      const saved = this._saveBackups(trimmed);

      this._emit("backup-created", {
        id: backup.id,
        reason: backup.reason,
        size: backup.size,
        saved
      });

      return {
        success: saved,
        backup: this._clone(backup)
      };
    }

    createAutomaticBackup(data, options) {
      this._assertAlive();

      if (!this.autoBackup) {
        return {
          success: false,
          skipped: true,
          reason: "automatic-backups-disabled"
        };
      }

      return this.createBackup(data, {
        ...(options || {}),
        reason: "automatic"
      });
    }

    listBackups() {
      this._assertAlive();

      return this._getBackups()
        .slice()
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map((backup) => ({
          id: backup.id,
          createdAt: backup.createdAt,
          version: backup.version,
          reason: backup.reason,
          description: backup.description,
          size: backup.size
        }));
    }

    getBackup(id) {
      this._assertAlive();

      if (typeof id !== "string" || !id) {
        return null;
      }

      const backup = this._getBackups().find((item) => item.id === id);

      return backup ? this._clone(backup) : null;
    }

    restoreBackup(id, options) {
      this._assertAlive();

      const backup = this.getBackup(id);

      if (!backup) {
        return {
          success: false,
          error: "Backup not found."
        };
      }

      const settings = options || {};

      if (typeof settings.validate === "function") {
        let valid = false;

        try {
          valid = settings.validate(this._clone(backup.data)) === true;
        } catch (error) {
          valid = false;
        }

        if (!valid) {
          return {
            success: false,
            error: "Backup validation failed."
          };
        }
      }

      if (typeof settings.apply === "function") {
        try {
          const result = settings.apply(this._clone(backup.data));

          if (result === false) {
            return {
              success: false,
              error: "Backup data could not be applied."
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      }

      this._emit("backup-restored", {
        id: backup.id,
        createdAt: backup.createdAt
      });

      return {
        success: true,
        data: this._clone(backup.data),
        backup: {
          id: backup.id,
          createdAt: backup.createdAt,
          reason: backup.reason
        }
      };
    }

    deleteBackup(id) {
      this._assertAlive();

      const backups = this._getBackups();
      const remaining = backups.filter((backup) => backup.id !== id);

      if (remaining.length === backups.length) {
        return {
          success: false,
          error: "Backup not found."
        };
      }

      const saved = this._saveBackups(remaining);

      this._emit("backup-deleted", {
        id,
        saved
      });

      return {
        success: saved,
        id
      };
    }

    clearBackups() {
      this._assertAlive();

      const saved = this._saveBackups([]);

      this._emit("backups-cleared", {
        saved
      });

      return {
        success: saved
      };
    }

    exportBackup(id) {
      this._assertAlive();

      const backup = this.getBackup(id);

      if (!backup) {
        return {
          success: false,
          error: "Backup not found."
        };
      }

      const payload = {
        format: "snake-game-backup",
        exportVersion: 1,
        exportedAt: new Date().toISOString(),
        backup
      };

      return {
        success: true,
        payload,
        json: this._serialize(payload)
      };
    }

    importBackup(input, options) {
      this._assertAlive();

      const settings = options || {};
      let payload = input;

      if (typeof input === "string") {
        try {
          payload = JSON.parse(input);
        } catch (error) {
          return {
            success: false,
            error: "Invalid JSON backup."
          };
        }
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        payload.format !== "snake-game-backup" ||
        !payload.backup ||
        typeof payload.backup !== "object" ||
        payload.backup.data === undefined
      ) {
        return {
          success: false,
          error: "Invalid backup format."
        };
      }

      if (
        typeof settings.validate === "function" &&
        settings.validate(this._clone(payload.backup.data)) !== true
      ) {
        return {
          success: false,
          error: "Imported backup validation failed."
        };
      }

      try {
        const result = this.createBackup(payload.backup.data, {
          reason: "imported",
          description: payload.backup.description || ""
        });

        this._emit("backup-imported", {
          id: result.backup.id,
          success: result.success
        });

        return result;
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
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

    getInfo() {
      this._assertAlive();

      const backups = this._getBackups();

      return {
        enabled: Boolean(this.storage),
        autoBackup: this.autoBackup,
        maxBackups: this.maxBackups,
        backupCount: backups.length,
        totalSize: backups.reduce(
          (total, backup) => total + (Number(backup.size) || 0),
          0
        )
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

  global.SnakeBackupManager = SnakeBackupManager;
})(window);