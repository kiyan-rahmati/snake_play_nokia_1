(function (global) {
  "use strict";

  class SnakeAudioSettings {
    constructor(options) {
      const settings = options || {};

      this.settingsManager = settings.settingsManager || null;
      this.audioManager = settings.audioManager || null;
      this.musicPlayer = settings.musicPlayer || null;

      this.root =
        typeof settings.root === "string"
          ? document.querySelector(settings.root)
          : settings.root || null;

      this.controls = {};
      this.unsubscribeSettings = null;
      this.destroyed = false;

      this.handleChange = this.handleChange.bind(this);

      if (settings.autoInit !== false) {
        this.initialize();
      }
    }

    initialize() {
      this._assertAlive();

      if (this.root) {
        this.controls = {
          soundEnabled: this._findControl("sound-enabled"),
          musicEnabled: this._findControl("music-enabled"),
          soundVolume: this._findControl("sound-volume"),
          musicVolume: this._findControl("music-volume")
        };

        this.root.addEventListener("change", this.handleChange);
        this.root.addEventListener("input", this.handleChange);
      }

      this._applySettings();
      this._subscribeToSettings();

      return this;
    }

    _findControl(name) {
      return this.root
        ? this.root.querySelector('[data-audio-setting="' + name + '"]')
        : null;
    }

    _subscribeToSettings() {
      if (
        !this.settingsManager ||
        typeof this.settingsManager.subscribe !== "function"
      ) {
        return;
      }

      this.unsubscribeSettings = this.settingsManager.subscribe((event) => {
        if (!event || !event.details) {
          return;
        }

        const key = event.details.key;

        if (
          event.type === "changed" &&
          ["soundEnabled", "musicEnabled", "soundVolume", "musicVolume"].includes(key)
        ) {
          this._applySettings();
        }

        if (event.type === "reset" || event.type === "updated") {
          this._applySettings();
        }
      });
    }

    handleChange(event) {
      this._assertAlive();

      const target = event.target;

      if (!target || !target.dataset.audioSetting) {
        return;
      }

      const key = target.dataset.audioSetting;

      if (
        !["soundEnabled", "musicEnabled", "soundVolume", "musicVolume"].includes(
          key
        )
      ) {
        return;
      }

      let value;

      if (key === "soundEnabled" || key === "musicEnabled") {
        value = Boolean(target.checked);
      } else {
        value = Number(target.value);

        if (!Number.isFinite(value)) {
          this._applySettings();
          return;
        }

        value = Math.min(1, Math.max(0, value));
      }

      if (this.settingsManager) {
        this.settingsManager.set(key, value);
      } else {
        this._applyAudioValue(key, value);
      }

      this._updateControlLabels();
    }

    _applySettings() {
      if (!this.settingsManager) {
        return;
      }

      const settings = this.settingsManager.getAll();

      for (const key of Object.keys(this.controls)) {
        const control = this.controls[key];

        if (!control || typeof settings[key] === "undefined") {
          continue;
        }

        if (key === "soundEnabled" || key === "musicEnabled") {
          control.checked = Boolean(settings[key]);
        } else {
          control.value = String(settings[key]);
        }
      }

      this._applyAudioValue("soundEnabled", settings.soundEnabled);
      this._applyAudioValue("musicEnabled", settings.musicEnabled);
      this._applyAudioValue("soundVolume", settings.soundVolume);
      this._applyAudioValue("musicVolume", settings.musicVolume);

      this._updateControlLabels();
    }

    _applyAudioValue(key, value) {
      switch (key) {
        case "soundEnabled":
          if (
            this.audioManager &&
            typeof this.audioManager.setSoundEnabled === "function"
          ) {
            this.audioManager.setSoundEnabled(Boolean(value));
          }
          break;

        case "musicEnabled":
          if (
            this.audioManager &&
            typeof this.audioManager.setMusicEnabled === "function"
          ) {
            this.audioManager.setMusicEnabled(Boolean(value));
          }

          if (
            this.musicPlayer &&
            typeof this.musicPlayer.setEnabled === "function"
          ) {
            this.musicPlayer.setEnabled(Boolean(value));
          } else if (
            this.musicPlayer &&
            typeof this.musicPlayer.setMuted === "function"
          ) {
            this.musicPlayer.setMuted(!value);
          }
          break;

        case "soundVolume":
          if (
            this.audioManager &&
            typeof this.audioManager.setSoundVolume === "function"
          ) {
            this.audioManager.setSoundVolume(Number(value));
          }
          break;

        case "musicVolume":
          if (
            this.audioManager &&
            typeof this.audioManager.setMusicVolume === "function"
          ) {
            this.audioManager.setMusicVolume(Number(value));
          }

          if (
            this.musicPlayer &&
            typeof this.musicPlayer.setVolume === "function"
          ) {
            this.musicPlayer.setVolume(Number(value));
          }
          break;

        default:
          break;
      }
    }

    _updateControlLabels() {
      if (!this.root) {
        return;
      }

      for (const key of ["soundVolume", "musicVolume"]) {
        const control = this.controls[key];

        if (!control) {
          continue;
        }

        const label = this.root.querySelector(
          '[data-audio-setting-label="' + key + '"]'
        );

        if (label) {
          label.textContent =
            Math.round(Number(control.value) * 100) + "%";
        }

        control.setAttribute(
          "aria-valuetext",
          Math.round(Number(control.value) * 100) + "%"
        );
      }
    }

    setSoundEnabled(enabled) {
      return this._setSetting("soundEnabled", Boolean(enabled));
    }

    setMusicEnabled(enabled) {
      return this._setSetting("musicEnabled", Boolean(enabled));
    }

    setSoundVolume(volume) {
      return this._setSetting("soundVolume", this._normalizeVolume(volume));
    }

    setMusicVolume(volume) {
      return this._setSetting("musicVolume", this._normalizeVolume(volume));
    }

    _setSetting(key, value) {
      this._assertAlive();

      if (this.settingsManager) {
        this.settingsManager.set(key, value);
      } else {
        this._applyAudioValue(key, value);
      }

      this._applySettings();

      return value;
    }

    _normalizeVolume(value) {
      const volume = Number(value);

      if (!Number.isFinite(volume)) {
        throw new TypeError("Volume must be a finite number.");
      }

      return Math.min(1, Math.max(0, volume));
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeAudioSettings has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.root) {
        this.root.removeEventListener("change", this.handleChange);
        this.root.removeEventListener("input", this.handleChange);
      }

      if (typeof this.unsubscribeSettings === "function") {
        this.unsubscribeSettings();
      }

      this.unsubscribeSettings = null;
      this.controls = {};
      this.root = null;
      this.settingsManager = null;
      this.audioManager = null;
      this.musicPlayer = null;
      this.destroyed = true;
    }
  }

  global.SnakeAudioSettings = SnakeAudioSettings;
})(window);