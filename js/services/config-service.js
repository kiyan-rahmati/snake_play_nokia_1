(function (global) {
  "use strict";

  const DEFAULT_CONFIG = {
    app: {
      name: "Snake Nokia",
      version: "2.0.0",
      environment: "production",
      debug: false
    },

    game: {
      initialLevel: 1,
      initialWorld: 1,
      initialSpeed: 7,
      minimumSpeed: 3,
      maximumSpeed: 18,
      speedIncrement: 0.5,
      initialLives: 3,
      maximumLives: 5,
      startingLength: 3,
      defaultGridColumns: 20,
      defaultGridRows: 20,
      pauseOnBlur: true,
      enableWallCollision: true,
      enableSelfCollision: true
    },

    controls: {
      keyboardEnabled: true,
      touchEnabled: true,
      swipeEnabled: true,
      swipeThreshold: 24,
      repeatDelay: 110,
      preventArrowScroll: true
    },

    audio: {
      enabled: true,
      masterVolume: 0.7,
      musicVolume: 0.55,
      effectsVolume: 0.8,
      muted: false,
      autoplay: false
    },

    storage: {
      prefix: "snake-nokia",
      version: 1,
      useLocalStorage: true,
      useSessionStorage: true,
      autosave: true,
      autosaveInterval: 30000
    },

    rendering: {
      targetFPS: 60,
      pixelRatioLimit: 2,
      smoothing: false,
      showGrid: true,
      animationsEnabled: true,
      reducedMotion: false
    },

    privacy: {
      collectAnalytics: false,
      requestPublicIPOnlyWithConsent: true
    },

    ui: {
      defaultTheme: "day",
      defaultLanguage: "en",
      supportedLanguages: ["en", "fa"],
      showFPS: false,
      showSystemInfo: false,
      confirmReset: true
    }
  };

  const ConfigService = {
    config: null,
    initialized: false,
    listeners: new Set(),

    init(overrides) {
      if (!this.config) {
        this.config = this.clone(DEFAULT_CONFIG);
      }

      if (overrides && typeof overrides === "object") {
        this.config = this.merge(this.config, overrides);
      }

      this.validate();
      this.initialized = true;
      this.emit("config:initialized", this.getAll());

      return this;
    },

    get(path, fallback) {
      if (!this.config) {
        this.init();
      }

      if (!path || typeof path !== "string") {
        return this.clone(this.config);
      }

      const value = path
        .split(".")
        .reduce((current, key) => {
          if (
            current === null ||
            current === undefined ||
            !Object.prototype.hasOwnProperty.call(current, key)
          ) {
            return undefined;
          }

          return current[key];
        }, this.config);

      if (value === undefined) {
        return fallback;
      }

      return this.clone(value);
    },

    getAll() {
      if (!this.config) {
        this.init();
      }

      return this.clone(this.config);
    },

    has(path) {
      if (!this.config || typeof path !== "string" || !path) {
        return false;
      }

      let current = this.config;

      for (const key of path.split(".")) {
        if (
          current === null ||
          current === undefined ||
          !Object.prototype.hasOwnProperty.call(current, key)
        ) {
          return false;
        }

        current = current[key];
      }

      return true;
    },

    set(path, value) {
      if (!this.config) {
        this.init();
      }

      if (typeof path !== "string" || !path.trim()) {
        throw new TypeError("Configuration path must be a non-empty string.");
      }

      const keys = path.split(".").filter(Boolean);

      if (!keys.length) {
        throw new TypeError("Configuration path is invalid.");
      }

      let current = this.config;

      for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index];

        if (
          !current[key] ||
          typeof current[key] !== "object" ||
          Array.isArray(current[key])
        ) {
          current[key] = {};
        }

        current = current[key];
      }

      const finalKey = keys[keys.length - 1];
      const previousValue = this.clone(current[finalKey]);
      const nextValue = this.clone(value);

      current[finalKey] = nextValue;

      try {
        this.validate();
      } catch (error) {
        current[finalKey] = previousValue;
        throw error;
      }

      this.emit("config:changed", {
        path,
        value: this.clone(nextValue),
        previousValue
      });

      return this.get(path);
    },

    update(values) {
      if (!values || typeof values !== "object" || Array.isArray(values)) {
        throw new TypeError("Configuration updates must be an object.");
      }

      if (!this.config) {
        this.init();
      }

      const previous = this.clone(this.config);
      this.config = this.merge(this.config, values);

      try {
        this.validate();
      } catch (error) {
        this.config = previous;
        throw error;
      }

      this.emit("config:updated", {
        config: this.getAll(),
        previous
      });

      return this.getAll();
    },

    reset(path) {
      if (!this.config) {
        this.init();
      }

      if (!path) {
        const previous = this.clone(this.config);
        this.config = this.clone(DEFAULT_CONFIG);
        this.validate();

        this.emit("config:reset", {
          config: this.getAll(),
          previous
        });

        return this.getAll();
      }

      const defaultValue = this.getDefault(path);

      if (defaultValue === undefined) {
        return false;
      }

      return this.set(path, defaultValue);
    },

    getDefault(path) {
      if (!path || typeof path !== "string") {
        return this.clone(DEFAULT_CONFIG);
      }

      const value = path
        .split(".")
        .reduce((current, key) => {
          if (
            current === null ||
            current === undefined ||
            !Object.prototype.hasOwnProperty.call(current, key)
          ) {
            return undefined;
          }

          return current[key];
        }, DEFAULT_CONFIG);

      return value === undefined ? undefined : this.clone(value);
    },

    merge(target, source) {
      const result = this.clone(target);

      Object.keys(source).forEach((key) => {
        const incoming = source[key];
        const existing = result[key];

        if (
          incoming &&
          typeof incoming === "object" &&
          !Array.isArray(incoming) &&
          existing &&
          typeof existing === "object" &&
          !Array.isArray(existing)
        ) {
          result[key] = this.merge(existing, incoming);
        } else {
          result[key] = this.clone(incoming);
        }
      });

      return result;
    },

    clone(value) {
      if (value === undefined) return undefined;

      if (typeof structuredClone === "function") {
        try {
          return structuredClone(value);
        } catch (_) {
          // Fall through to the JSON-compatible clone.
        }
      }

      if (value === null || typeof value !== "object") {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map((item) => this.clone(item));
      }

      const result = {};

      Object.keys(value).forEach((key) => {
        result[key] = this.clone(value[key]);
      });

      return result;
    },

    validate() {
      if (!this.config || typeof this.config !== "object") {
        throw new TypeError("Configuration must be an object.");
      }

      const numericRules = [
        ["game.initialLevel", 1, 10000],
        ["game.initialWorld", 1, 10000],
        ["game.initialSpeed", 1, 100],
        ["game.minimumSpeed", 1, 100],
        ["game.maximumSpeed", 1, 100],
        ["game.speedIncrement", 0.01, 100],
        ["game.initialLives", 0, 99],
        ["game.maximumLives", 0, 99],
        ["game.startingLength", 1, 1000],
        ["game.defaultGridColumns", 5, 200],
        ["game.defaultGridRows", 5, 200],
        ["controls.swipeThreshold", 1, 500],
        ["controls.repeatDelay", 0, 5000],
        ["audio.masterVolume", 0, 1],
        ["audio.musicVolume", 0, 1],
        ["audio.effectsVolume", 0, 1],
        ["storage.version", 1, 100000],
        ["storage.autosaveInterval", 1000, 86400000],
        ["rendering.targetFPS", 1, 240],
        ["rendering.pixelRatioLimit", 1, 5]
      ];

      numericRules.forEach(([path, minimum, maximum]) => {
        const value = this.get(path);

        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < minimum ||
          value > maximum
        ) {
          throw new RangeError(
            `Invalid configuration value for "${path}".`
          );
        }
      });

      if (
        this.get("game.minimumSpeed") >
        this.get("game.maximumSpeed")
      ) {
        throw new RangeError(
          "game.minimumSpeed cannot exceed game.maximumSpeed."
        );
      }

      if (
        this.get("game.initialSpeed") <
          this.get("game.minimumSpeed") ||
        this.get("game.initialSpeed") >
          this.get("game.maximumSpeed")
      ) {
        throw new RangeError(
          "game.initialSpeed must be within the configured speed limits."
        );
      }

      if (
        this.get("game.initialLives") >
        this.get("game.maximumLives")
      ) {
        throw new RangeError(
          "game.initialLives cannot exceed game.maximumLives."
        );
      }

      const booleanPaths = [
        "app.debug",
        "game.pauseOnBlur",
        "game.enableWallCollision",
        "game.enableSelfCollision",
        "controls.keyboardEnabled",
        "controls.touchEnabled",
        "controls.swipeEnabled",
        "controls.preventArrowScroll",
        "audio.enabled",
        "audio.muted",
        "audio.autoplay",
        "storage.useLocalStorage",
        "storage.useSessionStorage",
        "storage.autosave",
        "rendering.smoothing",
        "rendering.showGrid",
        "rendering.animationsEnabled",
        "rendering.reducedMotion",
        "privacy.collectAnalytics",
        "privacy.requestPublicIPOnlyWithConsent",
        "ui.showFPS",
        "ui.showSystemInfo",
        "ui.confirmReset"
      ];

      booleanPaths.forEach((path) => {
        if (typeof this.get(path) !== "boolean") {
          throw new TypeError(
            `Configuration value "${path}" must be a boolean.`
          );
        }
      });

      const languages = this.get("ui.supportedLanguages");

      if (
        !Array.isArray(languages) ||
        languages.length === 0 ||
        !languages.every(
          (language) =>
            typeof language === "string" &&
            /^[a-z]{2}(-[A-Z]{2})?$/.test(language)
        )
      ) {
        throw new TypeError(
          "ui.supportedLanguages must contain valid language codes."
        );
      }

      if (!languages.includes(this.get("ui.defaultLanguage"))) {
        throw new RangeError(
          "ui.defaultLanguage must be a supported language."
        );
      }

      const theme = this.get("ui.defaultTheme");

      if (typeof theme !== "string" || !theme.trim()) {
        throw new TypeError("ui.defaultTheme must be a non-empty string.");
      }

      return true;
    },

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Configuration listener must be a function.");
      }

      this.listeners.add(listener);

      return () => {
        this.listeners.delete(listener);
      };
    },

    emit(eventName, detail) {
      const payload = {
        type: eventName,
        detail: this.clone(detail),
        timestamp: Date.now()
      };

      this.listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          if (
            global.console &&
            typeof global.console.error === "function"
          ) {
            global.console.error(
              "[ConfigService] Listener error:",
              error
            );
          }
        }
      });

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit(eventName, payload.detail);
      }
    },

    destroy() {
      this.listeners.clear();
      this.config = null;
      this.initialized = false;
    }
  };

  global.SnakeConfigService = ConfigService;
})(window);