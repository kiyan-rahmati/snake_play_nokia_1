(function (global) {
  "use strict";

  const ACCESSIBILITY_SETTINGS = Object.freeze({
    reducedMotion: false,
    highContrast: false,
    screenReaderSupport: false
  });

  class SnakeAccessibilitySettings {
    constructor(options) {
      const settings = options || {};

      this.settingsManager = settings.settingsManager || null;

      this.root =
        typeof settings.root === "string"
          ? document.querySelector(settings.root)
          : settings.root || null;

      this.target =
        typeof settings.target === "string"
          ? document.querySelector(settings.target)
          : settings.target || document.documentElement;

      this.settings = { ...ACCESSIBILITY_SETTINGS };
      this.unsubscribeSettings = null;
      this.destroyed = false;

      this.handleChange = this.handleChange.bind(this);
      this.handleMotionPreferenceChange =
        this.handleMotionPreferenceChange.bind(this);

      this.motionMediaQuery = null;

      if (settings.autoInit !== false) {
        this.initialize();
      }
    }

    initialize() {
      this._assertAlive();

      this._loadSettings();
      this._bindEvents();
      this._subscribeToSettings();
      this._watchSystemMotionPreference();
      this.applySettings();
      this._syncControls();

      return this;
    }

    _loadSettings() {
      if (
        !this.settingsManager ||
        typeof this.settingsManager.getAll !== "function"
      ) {
        return;
      }

      const saved = this.settingsManager.getAll();

      for (const key of Object.keys(ACCESSIBILITY_SETTINGS)) {
        if (typeof saved[key] === "boolean") {
          this.settings[key] = saved[key];
        }
      }
    }

    _bindEvents() {
      if (this.root) {
        this.root.addEventListener("change", this.handleChange);
      }
    }

    _subscribeToSettings() {
      if (
        !this.settingsManager ||
        typeof this.settingsManager.subscribe !== "function"
      ) {
        return;
      }

      this.unsubscribeSettings = this.settingsManager.subscribe((event) => {
        if (!event) {
          return;
        }

        if (event.type === "changed" && event.details) {
          const key = event.details.key;

          if (
            Object.prototype.hasOwnProperty.call(
              ACCESSIBILITY_SETTINGS,
              key
            ) &&
            typeof event.details.value === "boolean"
          ) {
            this.settings[key] = event.details.value;
          }
        } else if (
          event.type === "reset" ||
          event.type === "updated" ||
          event.type === "loaded"
        ) {
          this._loadSettings();
        }

        this.applySettings();
        this._syncControls();
      });
    }

    _watchSystemMotionPreference() {
      if (typeof global.matchMedia !== "function") {
        return;
      }

      this.motionMediaQuery = global.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

      if (
        typeof this.motionMediaQuery.addEventListener === "function"
      ) {
        this.motionMediaQuery.addEventListener(
          "change",
          this.handleMotionPreferenceChange
        );
      } else if (
        typeof this.motionMediaQuery.addListener === "function"
      ) {
        this.motionMediaQuery.addListener(
          this.handleMotionPreferenceChange
        );
      }
    }

    handleMotionPreferenceChange() {
      this._assertAlive();

      this.applySettings();
    }

    handleChange(event) {
      this._assertAlive();

      const control = event.target;

      if (!control || !control.dataset.accessibilitySetting) {
        return;
      }

      const key = control.dataset.accessibilitySetting;

      if (
        !Object.prototype.hasOwnProperty.call(
          ACCESSIBILITY_SETTINGS,
          key
        )
      ) {
        return;
      }

      if (control.type !== "checkbox") {
        this._syncControls();
        return;
      }

      this.setSetting(key, control.checked);
    }

    setSetting(key, enabled) {
      this._assertAlive();

      if (
        !Object.prototype.hasOwnProperty.call(
          ACCESSIBILITY_SETTINGS,
          key
        )
      ) {
        throw new Error("Unknown accessibility setting: " + key);
      }

      if (typeof enabled !== "boolean") {
        throw new TypeError("Accessibility setting must be a boolean.");
      }

      const previousValue = this.settings[key];

      this.settings[key] = enabled;

      if (
        this.settingsManager &&
        this.settingsManager.get(key) !== enabled
      ) {
        this.settingsManager.set(key, enabled);
      }

      this.applySettings();
      this._syncControls();

      if (previousValue !== enabled) {
        this._emit("changed", {
          key,
          value: enabled,
          previousValue
        });
      }

      return enabled;
    }

    getSetting(key) {
      this._assertAlive();

      if (
        !Object.prototype.hasOwnProperty.call(
          ACCESSIBILITY_SETTINGS,
          key
        )
      ) {
        return undefined;
      }

      return this.settings[key];
    }

    getAll() {
      this._assertAlive();

      return { ...this.settings };
    }

    applySettings() {
      this._assertAlive();

      if (!this.target) {
        return false;
      }

      const reducedMotion =
        this.settings.reducedMotion ||
        Boolean(
          this.motionMediaQuery &&
          this.motionMediaQuery.matches
        );

      this.target.classList.toggle(
        "accessibility-reduced-motion",
        reducedMotion
      );

      this.target.classList.toggle(
        "accessibility-high-contrast",
        this.settings.highContrast
      );

      this.target.classList.toggle(
        "accessibility-screen-reader",
        this.settings.screenReaderSupport
      );

      this.target.setAttribute(
        "data-reduced-motion",
        String(reducedMotion)
      );

      this.target.setAttribute(
        "data-high-contrast",
        String(this.settings.highContrast)
      );

      this.target.setAttribute(
        "data-screen-reader-support",
        String(this.settings.screenReaderSupport)
      );

      if (this.settings.screenReaderSupport) {
        this.target.setAttribute("data-accessibility-announcements", "true");
      } else {
        this.target.removeAttribute("data-accessibility-announcements");
      }

      return true;
    }

    _syncControls() {
      if (!this.root) {
        return;
      }

      for (const key of Object.keys(ACCESSIBILITY_SETTINGS)) {
        const control = this.root.querySelector(
          '[data-accessibility-setting="' + key + '"]'
        );

        if (control && control.type === "checkbox") {
          control.checked = this.settings[key];
        }
      }
    }

    announce(message, priority) {
      this._assertAlive();

      if (
        !this.settings.screenReaderSupport ||
        typeof message !== "string" ||
        !message.trim()
      ) {
        return false;
      }

      let liveRegion = document.querySelector(
        "[data-snake-accessibility-live-region]"
      );

      if (!liveRegion) {
        liveRegion = document.createElement("div");
        liveRegion.setAttribute(
          "data-snake-accessibility-live-region",
          "true"
        );
        liveRegion.setAttribute("aria-live", "polite");
        liveRegion.setAttribute("aria-atomic", "true");
        liveRegion.className = "visually-hidden";
        document.body.appendChild(liveRegion);
      }

      liveRegion.setAttribute(
        "aria-live",
        priority === "assertive" ? "assertive" : "polite"
      );

      liveRegion.textContent = message.trim();

      return true;
    }

    _emit(type, details) {
      const event = {
        type,
        details: details || null,
        settings: this.getAll(),
        timestamp: new Date().toISOString()
      };

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("accessibility:" + type, event);
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error(
          "SnakeAccessibilitySettings has been destroyed."
        );
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.root) {
        this.root.removeEventListener("change", this.handleChange);
      }

      if (
        this.motionMediaQuery &&
        typeof this.motionMediaQuery.removeEventListener === "function"
      ) {
        this.motionMediaQuery.removeEventListener(
          "change",
          this.handleMotionPreferenceChange
        );
      } else if (
        this.motionMediaQuery &&
        typeof this.motionMediaQuery.removeListener === "function"
      ) {
        this.motionMediaQuery.removeListener(
          this.handleMotionPreferenceChange
        );
      }

      if (typeof this.unsubscribeSettings === "function") {
        this.unsubscribeSettings();
      }

      this.unsubscribeSettings = null;
      this.motionMediaQuery = null;
      this.root = null;
      this.target = null;
      this.settingsManager = null;
      this.destroyed = true;
    }
  }

  global.SnakeAccessibilitySettings = SnakeAccessibilitySettings;
  global.SnakeAccessibilityDefaults = ACCESSIBILITY_SETTINGS;
})(window);