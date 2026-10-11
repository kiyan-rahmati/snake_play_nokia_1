(function (global) {
  "use strict";

  class SnakeDayNightToggle {
    constructor(options) {
      const settings = options || {};

      this.themeManager = settings.themeManager || null;
      this.settingsManager = settings.settingsManager || null;

      this.toggleButton =
        typeof settings.toggleButton === "string"
          ? document.querySelector(settings.toggleButton)
          : settings.toggleButton || null;

      this.modeSelect =
        typeof settings.modeSelect === "string"
          ? document.querySelector(settings.modeSelect)
          : settings.modeSelect || null;

      this.mediaQuery = null;
      this.mediaQueryHandler = null;
      this.unsubscribeSettings = null;
      this.destroyed = false;

      this.handleToggleClick = this.handleToggleClick.bind(this);
      this.handleModeChange = this.handleModeChange.bind(this);
      this.handleSystemThemeChange =
        this.handleSystemThemeChange.bind(this);

      this._bindEvents();

      if (settings.autoInit !== false) {
        this.initialize();
      }
    }

    initialize() {
      this._assertAlive();

      this._syncControls();

      const mode = this.settingsManager
        ? this.settingsManager.get("dayNightMode")
        : "manual";

      if (mode === "automatic") {
        this.enableAutomaticMode();
      }

      if (
        this.settingsManager &&
        typeof this.settingsManager.subscribe === "function"
      ) {
        this.unsubscribeSettings = this.settingsManager.subscribe((event) => {
          if (
            event &&
            event.type === "changed" &&
            event.details &&
            event.details.key === "dayNightMode"
          ) {
            if (event.details.value === "automatic") {
              this.enableAutomaticMode();
            } else {
              this.disableAutomaticMode();
            }

            this._syncControls();
          }
        });
      }

      return this;
    }

    _bindEvents() {
      if (this.toggleButton) {
        this.toggleButton.addEventListener(
          "click",
          this.handleToggleClick
        );
      }

      if (this.modeSelect) {
        this.modeSelect.addEventListener(
          "change",
          this.handleModeChange
        );
      }
    }

    handleToggleClick(event) {
      event.preventDefault();

      if (!this.themeManager) {
        return;
      }

      this.disableAutomaticMode();

      if (
        this.settingsManager &&
        this.settingsManager.get("dayNightMode") !== "manual"
      ) {
        this.settingsManager.set("dayNightMode", "manual");
      }

      this.themeManager.toggleTheme();
      this._syncControls();
    }

    handleModeChange(event) {
      const mode = event.target.value;

      if (mode === "automatic") {
        if (this.settingsManager) {
          this.settingsManager.set("dayNightMode", "automatic");
        }

        this.enableAutomaticMode();
        return;
      }

      if (mode === "manual") {
        if (this.settingsManager) {
          this.settingsManager.set("dayNightMode", "manual");
        }

        this.disableAutomaticMode();
        this._syncControls();
      }
    }

    enableAutomaticMode() {
      this._assertAlive();

      if (typeof global.matchMedia !== "function") {
        return false;
      }

      if (!this.mediaQuery) {
        this.mediaQuery = global.matchMedia(
          "(prefers-color-scheme: light)"
        );

        this.mediaQueryHandler = this.handleSystemThemeChange;

        if (typeof this.mediaQuery.addEventListener === "function") {
          this.mediaQuery.addEventListener(
            "change",
            this.mediaQueryHandler
          );
        } else if (typeof this.mediaQuery.addListener === "function") {
          this.mediaQuery.addListener(this.mediaQueryHandler);
        }
      }

      this._applySystemTheme();
      this._syncControls();

      return true;
    }

    disableAutomaticMode() {
      if (this.mediaQuery && this.mediaQueryHandler) {
        if (typeof this.mediaQuery.removeEventListener === "function") {
          this.mediaQuery.removeEventListener(
            "change",
            this.mediaQueryHandler
          );
        } else if (typeof this.mediaQuery.removeListener === "function") {
          this.mediaQuery.removeListener(this.mediaQueryHandler);
        }
      }

      this.mediaQuery = null;
      this.mediaQueryHandler = null;

      return true;
    }

    handleSystemThemeChange() {
      this._applySystemTheme();
      this._syncControls();
    }

    _applySystemTheme() {
      if (!this.themeManager || !this.mediaQuery) {
        return;
      }

      const theme = this.mediaQuery.matches ? "day" : "night";

      this.themeManager.applyTheme(theme, {
        source: "system",
        persist: false
      });

      if (
        this.settingsManager &&
        this.settingsManager.get("theme") !== theme
      ) {
        this.settingsManager.set("theme", theme);
      }
    }

    _syncControls() {
      const theme = this.themeManager
        ? this.themeManager.getCurrentTheme()
        : "night";

      const mode = this.settingsManager
        ? this.settingsManager.get("dayNightMode")
        : "manual";

      if (this.toggleButton) {
        this.toggleButton.setAttribute(
          "aria-pressed",
          String(theme === "day")
        );

        this.toggleButton.setAttribute(
          "aria-label",
          theme === "day"
            ? "Switch to night theme"
            : "Switch to day theme"
        );

        this.toggleButton.dataset.theme = theme;
      }

      if (this.modeSelect) {
        this.modeSelect.value =
          mode === "automatic" ? "automatic" : "manual";
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeDayNightToggle has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.toggleButton) {
        this.toggleButton.removeEventListener(
          "click",
          this.handleToggleClick
        );
      }

      if (this.modeSelect) {
        this.modeSelect.removeEventListener(
          "change",
          this.handleModeChange
        );
      }

      this.disableAutomaticMode();

      if (typeof this.unsubscribeSettings === "function") {
        this.unsubscribeSettings();
      }

      this.unsubscribeSettings = null;
      this.toggleButton = null;
      this.modeSelect = null;
      this.themeManager = null;
      this.settingsManager = null;
      this.destroyed = true;
    }
  }

  global.SnakeDayNightToggle = SnakeDayNightToggle;
})(window);