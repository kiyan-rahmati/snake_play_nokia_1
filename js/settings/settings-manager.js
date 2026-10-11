(function (global) {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    theme: "night",
    dayNightMode: "manual",
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 0.7,
    musicVolume: 0.5,
    controlMode: "keyboard",
    keyBindings: {
      up: ["ArrowUp", "w", "W"],
      down: ["ArrowDown", "s", "S"],
      left: ["ArrowLeft", "a", "A"],
      right: ["ArrowRight", "d", "D"],
      pause: ["Escape", "p", "P"]
    },
    reducedMotion: false,
    highContrast: false,
    screenReaderSupport: false,
    showFPS: false,
    showSystemInfo: false,
    showPublicIP: false,
    language: "en",
    gridVisible: true,
    screenShake: true,
    particlesEnabled: true
  });

  const STORAGE_KEY = "snake-game-settings";
  const SETTINGS_VERSION = 1;

  class SnakeSettingsManager {
    constructor(options) {
      const config = options || {};

      this.storageKey = config.storageKey || STORAGE_KEY;
      this.storage = this._resolveStorage(config.storage);
      this.settings = this._clone(DEFAULT_SETTINGS);
      this.listeners = new Set();
      this.destroyed = false;

      if (config.autoLoad !== false) {
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

    _clone(value) {
      if (typeof global.structuredClone === "function") {
        return global.structuredClone(value);
      }

      return JSON.parse(JSON.stringify(value));
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeSettingsManager has been destroyed.");
      }
    }

    load() {
      this._assertAlive();

      let stored = null;

      try {
        const raw = this.storage
          ? this.storage.getItem(this.storageKey)
          : null;

        if (raw) {
          stored = JSON.parse(raw);
        }
      } catch (error) {
        stored = null;
      }

      this.settings = this._mergeDefaults(
        stored &&
          stored.version === SETTINGS_VERSION &&
          stored.settings &&
          typeof stored.settings === "object"
          ? stored.settings
          : {}
      );

      this._emit("loaded", {
        settings: this.getAll()
      });

      return this.getAll();
    }

    _mergeDefaults(source) {
      const result = this._clone(DEFAULT_SETTINGS);

      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        if (!Object.prototype.hasOwnProperty.call(source, key)) {
          continue;
        }

        const defaultValue = DEFAULT_SETTINGS[key];
        const value = source[key];

        if (
          defaultValue &&
          typeof defaultValue === "object" &&
          !Array.isArray(defaultValue)
        ) {
          if (value && typeof value === "object" && !Array.isArray(value)) {
            result[key] = {
              ...defaultValue,
              ...value
            };
          }
        } else if (typeof value === typeof defaultValue) {
          result[key] = value;
        }
      }

      result.soundVolume = this._clampVolume(result.soundVolume);
      result.musicVolume = this._clampVolume(result.musicVolume);

      if (!["day", "night"].includes(result.theme)) {
        result.theme = DEFAULT_SETTINGS.theme;
      }

      if (!["manual", "automatic"].includes(result.dayNightMode)) {
        result.dayNightMode = DEFAULT_SETTINGS.dayNightMode;
      }

      if (!["keyboard", "touch", "mixed"].includes(result.controlMode)) {
        result.controlMode = DEFAULT_SETTINGS.controlMode;
      }

      if (!["en", "fa"].includes(result.language)) {
        result.language = DEFAULT_SETTINGS.language;
      }

      return result;
    }

    getAll() {
      this._assertAlive();
      return this._clone(this.settings);
    }

    get(key) {
      this._assertAlive();

      if (!Object.prototype.hasOwnProperty.call(this.settings, key)) {
        return undefined;
      }

      const value = this.settings[key];

      return value && typeof value === "object"
        ? this._clone(value)
        : value;
    }

    set(key, value) {
      this._assertAlive();

      if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
        throw new Error("Unknown settings key: " + key);
      }

      const validated = this._validateValue(key, value);

      if (this._isEqual(this.settings[key], validated)) {
        return this.get(key);
      }

      const previousValue = this._clone(this.settings[key]);

      this.settings[key] =
        validated && typeof validated === "object"
          ? this._clone(validated)
          : validated;

      this.save();

      this._emit("changed", {
        key,
        value: this.get(key),
        previousValue
      });

      return this.get(key);
    }

    update(values) {
      this._assertAlive();

      if (!values || typeof values !== "object" || Array.isArray(values)) {
        throw new TypeError("Settings update must be an object.");
      }

      const updates = {};

      for (const [key, value] of Object.entries(values)) {
        if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
          throw new Error("Unknown settings key: " + key);
        }

        updates[key] = this._validateValue(key, value);
      }

      const previousSettings = this.getAll();

      this.settings = {
        ...this.settings,
        ...this._clone(updates)
      };

      this.save();

      this._emit("updated", {
        settings: this.getAll(),
        previousSettings
      });

      return this.getAll();
    }

    _validateValue(key, value) {
      const defaultValue = DEFAULT_SETTINGS[key];

      if (key === "soundVolume" || key === "musicVolume") {
        const number = Number(value);

        if (!Number.isFinite(number)) {
          throw new TypeError(key + " must be a finite number.");
        }

        return this._clampVolume(number);
      }

      if (key === "theme" && !["day", "night"].includes(value)) {
        throw new TypeError("Theme must be 'day' or 'night'.");
      }

      if (
        key === "dayNightMode" &&
        !["manual", "automatic"].includes(value)
      ) {
        throw new TypeError("Invalid day/night mode.");
      }

      if (
        key === "controlMode" &&
        !["keyboard", "touch", "mixed"].includes(value)
      ) {
        throw new TypeError("Invalid control mode.");
      }

      if (key === "language" && !["en", "fa"].includes(value)) {
        throw new TypeError("Unsupported language.");
      }

      if (key === "keyBindings") {
        return this._validateKeyBindings(value);
      }

      if (
        defaultValue &&
        typeof defaultValue === "object" &&
        !Array.isArray(defaultValue)
      ) {
        throw new TypeError("Invalid settings object.");
      }

      if (typeof value !== typeof defaultValue) {
        throw new TypeError("Invalid value type for setting: " + key);
      }

      return value;
    }

    _validateKeyBindings(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Key bindings must be an object.");
      }

      const allowedActions = Object.keys(DEFAULT_SETTINGS.keyBindings);
      const bindings = {};

      for (const action of allowedActions) {
        const keys = value[action];

        if (!Array.isArray(keys) || keys.length === 0) {
          bindings[action] = this._clone(
            DEFAULT_SETTINGS.keyBindings[action]
          );
          continue;
        }

        bindings[action] = keys
          .filter((key) => typeof key === "string" && key.length > 0)
          .slice(0, 8);
      }

      return bindings;
    }

    _clampVolume(value) {
      return Math.min(1, Math.max(0, value));
    }

    _isEqual(first, second) {
      return JSON.stringify(first) === JSON.stringify(second);
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
            version: SETTINGS_VERSION,
            updatedAt: new Date().toISOString(),
            settings: this.settings
          })
        );

        return true;
      } catch (error) {
        return false;
      }
    }

    reset() {
      this._assertAlive();

      const previousSettings = this.getAll();
      this.settings = this._clone(DEFAULT_SETTINGS);
      this.save();

      this._emit("reset", {
        settings: this.getAll(),
        previousSettings
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
        settings: this.getAll(),
        timestamp: new Date().toISOString()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error(
              "[SnakeSettingsManager] Listener error:",
              error
            );
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("settings:" + type, event);
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeSettingsManager = SnakeSettingsManager;
  global.SnakeDefaultSettings = DEFAULT_SETTINGS;
})(window);