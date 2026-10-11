(function (global) {
  "use strict";

  const CURRENT_VERSION = 1;

  class SnakeSaveMigrations {
    constructor(options) {
      const settings = options || {};

      this.currentVersion = Number(settings.currentVersion) || CURRENT_VERSION;
      this.migrations = new Map();
      this.registerDefaultMigrations();
    }

    register(version, migration) {
      if (!Number.isInteger(version) || version < 1) {
        throw new TypeError("Migration version must be a positive integer.");
      }

      if (typeof migration !== "function") {
        throw new TypeError("Migration must be a function.");
      }

      if (version >= this.currentVersion) {
        throw new RangeError("Migration version must be below the current version.");
      }

      this.migrations.set(version, migration);
      return this;
    }

    registerDefaultMigrations() {
      this.register(1, function migrateVersionOne(data) {
        const result = this.clone(data);

        result.version = 1;

        if (!result.profile || typeof result.profile !== "object") {
          result.profile = {
            name: "Player",
            createdAt: null,
            lastPlayedAt: null
          };
        }

        if (!result.progress || typeof result.progress !== "object") {
          result.progress = {
            totalGames: 0,
            totalScore: 0,
            totalFood: 0,
            totalPlayTime: 0,
            highestLevel: 1,
            highestWorld: 1,
            unlockedLevels: [1],
            unlockedWorlds: [1]
          };
        }

        if (!result.records || typeof result.records !== "object") {
          result.records = {
            highScore: 0,
            longestGame: 0,
            mostFoodInGame: 0,
            bestScores: []
          };
        }

        if (!result.achievements || typeof result.achievements !== "object") {
          result.achievements = {
            unlocked: [],
            progress: {},
            updatedAt: null
          };
        }

        if (!result.settings || typeof result.settings !== "object") {
          result.settings = {
            theme: "day",
            soundEnabled: true,
            musicEnabled: true,
            soundVolume: 0.7,
            musicVolume: 0.5,
            controlMode: "keyboard",
            vibrationEnabled: true,
            reducedMotion: false,
            language: "en"
          };
        }

        if (!result.session || typeof result.session !== "object") {
          result.session = {
            lastSessionId: null,
            lastLevelId: null,
            lastWorldId: null,
            lastScore: 0,
            lastResult: null
          };
        }

        if (!result.history || typeof result.history !== "object") {
          result.history = {
            sessions: []
          };
        }

        if (!result.metadata || typeof result.metadata !== "object") {
          result.metadata = {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            checksum: null
          };
        }

        return result;
      });
    }

    clone(value) {
      if (value === undefined) {
        return undefined;
      }

      return JSON.parse(JSON.stringify(value));
    }

    getVersion(data) {
      if (!data || typeof data !== "object") {
        return 0;
      }

      const version = Number(data.version);

      if (!Number.isInteger(version) || version < 0) {
        return 0;
      }

      return version;
    }

    migrate(input, options) {
      const settings = options || {};
      const original = this.clone(input);

      if (!original || typeof original !== "object" || Array.isArray(original)) {
        return {
          success: false,
          data: null,
          fromVersion: 0,
          toVersion: this.currentVersion,
          applied: [],
          errors: ["Invalid save data."]
        };
      }

      let data = original;
      let version = this.getVersion(data);
      const fromVersion = version;
      const applied = [];
      const errors = [];

      if (version > this.currentVersion) {
        return {
          success: false,
          data: original,
          fromVersion,
          toVersion: this.currentVersion,
          applied,
          errors: ["Save data was created by a newer version of the game."]
        };
      }

      try {
        while (version < this.currentVersion) {
          const nextVersion = version + 1;
          const migration = this.migrations.get(nextVersion);

          if (!migration) {
            throw new Error(
              "Missing migration for version " + nextVersion + "."
            );
          }

          const migrated = migration.call(this, this.clone(data));

          if (
            !migrated ||
            typeof migrated !== "object" ||
            Array.isArray(migrated)
          ) {
            throw new Error(
              "Migration " + nextVersion + " returned invalid data."
            );
          }

          migrated.version = nextVersion;
          data = migrated;
          version = nextVersion;
          applied.push(nextVersion);
        }

        if (global.SnakeSaveSchema) {
          data = global.SnakeSaveSchema.normalize(data);

          const validation = global.SnakeSaveSchema.validate(data);

          if (!validation.valid) {
            throw new Error(validation.errors.join(" "));
          }
        }

        if (settings.updateTimestamp !== false && data.metadata) {
          data.metadata.updatedAt = new Date().toISOString();
        }

        return {
          success: true,
          data,
          fromVersion,
          toVersion: version,
          applied,
          errors
        };
      } catch (error) {
        return {
          success: false,
          data: original,
          fromVersion,
          toVersion: this.currentVersion,
          applied,
          errors: [error.message]
        };
      }
    }

    canMigrate(version) {
      if (!Number.isInteger(version) || version < 0) {
        return false;
      }

      if (version > this.currentVersion) {
        return false;
      }

      for (let nextVersion = version + 1; nextVersion <= this.currentVersion; nextVersion += 1) {
        if (!this.migrations.has(nextVersion)) {
          return false;
        }
      }

      return true;
    }

    getMigrationVersions() {
      return Array.from(this.migrations.keys()).sort((a, b) => a - b);
    }

    getCurrentVersion() {
      return this.currentVersion;
    }
  }

  global.SnakeSaveMigrations = SnakeSaveMigrations;
})(window);