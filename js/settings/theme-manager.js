(function (global) {
  "use strict";

  const THEMES = Object.freeze({
    day: "day",
    night: "night"
  });

  const DEFAULT_THEME = "night";

  class SnakeThemeManager {
    constructor(options) {
      const settings = options || {};

      this.settingsManager = settings.settingsManager || null;
      this.root = settings.root || document.documentElement;
      this.themeDirectory = settings.themeDirectory || "themes";
      this.defaultTheme = settings.defaultTheme || DEFAULT_THEME;
      this.currentTheme = null;
      this.listeners = new Set();
      this.unsubscribeSettings = null;
      this.mediaQuery = null;
      this.mediaQueryHandler = null;
      this.destroyed = false;

      this.handleStorageChange = this.handleStorageChange.bind(this);

      if (settings.autoInit !== false) {
        this.initialize();
      }
    }

    initialize() {
      this._assertAlive();

      let theme = this.defaultTheme;

      if (
        this.settingsManager &&
        typeof this.settingsManager.get === "function"
      ) {
        const savedTheme = this.settingsManager.get("theme");

        if (this._isValidTheme(savedTheme)) {
          theme = savedTheme;
        }
      }

      this.applyTheme(theme, {
        persist: false,
        source: "initialize"
      });

      if (
        this.settingsManager &&
        typeof this.settingsManager.subscribe === "function"
      ) {
        this.unsubscribeSettings = this.settingsManager.subscribe((event) => {
          if (
            event &&
            event.type === "changed" &&
            event.details &&
            event.details.key === "theme"
          ) {
            const nextTheme = event.details.value;

            if (this._isValidTheme(nextTheme)) {
              this.applyTheme(nextTheme, {
                persist: false,
                source: "settings"
              });
            }
          }
        });
      }

      global.addEventListener("storage", this.handleStorageChange);

      return this.currentTheme;
    }

    applyTheme(theme, options) {
      this._assertAlive();

      const settings = options || {};

      if (!this._isValidTheme(theme)) {
        throw new TypeError("Theme must be 'day' or 'night'.");
      }

      const previousTheme = this.currentTheme;

      this.currentTheme = theme;

      if (this.root) {
        this.root.setAttribute("data-theme", theme);
        this.root.classList.toggle("theme-day", theme === THEMES.day);
        this.root.classList.toggle("theme-night", theme === THEMES.night);
      }

      this._updateThemeStylesheet(theme);

      if (
        settings.persist !== false &&
        this.settingsManager &&
        typeof this.settingsManager.set === "function"
      ) {
        if (this.settingsManager.get("theme") !== theme) {
          this.settingsManager.set("theme", theme);
        }
      }

      if (previousTheme !== theme) {
        this._emit("changed", {
          theme,
          previousTheme,
          source: settings.source || "manual"
        });
      }

      return this.currentTheme;
    }

    toggleTheme() {
      this._assertAlive();

      const nextTheme =
        this.currentTheme === THEMES.day ? THEMES.night : THEMES.day;

      return this.applyTheme(nextTheme, {
        source: "toggle"
      });
    }

    setDayTheme() {
      return this.applyTheme(THEMES.day);
    }

    setNightTheme() {
      return this.applyTheme(THEMES.night);
    }

    getCurrentTheme() {
      this._assertAlive();
      return this.currentTheme;
    }

    isDayTheme() {
      this._assertAlive();
      return this.currentTheme === THEMES.day;
    }

    isNightTheme() {
      this._assertAlive();
      return this.currentTheme === THEMES.night;
    }

    _updateThemeStylesheet(theme) {
      if (!global.document) {
        return;
      }

      const href = this.themeDirectory + "/" + theme + "/theme.css";
      let stylesheet = document.querySelector(
        'link[data-snake-theme-stylesheet="true"]'
      );

      if (!stylesheet) {
        stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.dataset.snakeThemeStylesheet = "true";
        document.head.appendChild(stylesheet);
      }

      if (stylesheet.getAttribute("href") !== href) {
        stylesheet.setAttribute("href", href);
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
        theme: this.currentTheme,
        timestamp: new Date().toISOString()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error("[SnakeThemeManager] Listener error:", error);
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("theme:" + type, event);
      }
    }

    handleStorageChange(event) {
      if (
        !event ||
        !this.settingsManager ||
        event.key !== "snake-game-settings" ||
        !event.newValue
      ) {
        return;
      }

      try {
        const stored = JSON.parse(event.newValue);
        const theme = stored &&
          stored.settings &&
          stored.settings.theme;

        if (this._isValidTheme(theme)) {
          this.applyTheme(theme, {
            persist: false,
            source: "storage"
          });
        }
      } catch (error) {
        return;
      }
    }

    _isValidTheme(theme) {
      return theme === THEMES.day || theme === THEMES.night;
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeThemeManager has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (typeof this.unsubscribeSettings === "function") {
        this.unsubscribeSettings();
      }

      global.removeEventListener("storage", this.handleStorageChange);

      this.listeners.clear();
      this.unsubscribeSettings = null;
      this.mediaQuery = null;
      this.mediaQueryHandler = null;
      this.settingsManager = null;
      this.root = null;
      this.destroyed = true;
    }
  }

  global.SnakeThemeManager = SnakeThemeManager;
  global.SnakeThemes = THEMES;
})(window);