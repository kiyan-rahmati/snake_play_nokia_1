(function (global) {
  "use strict";

  class AudioPreferences {
    constructor(options) {
      const settings = options || {};

      this.storage = settings.storage || null;
      this.storageKey = settings.storageKey || "snake.audio.preferences";
      this.audioManager = settings.audioManager || null;
      this.musicPlayer = settings.musicPlayer || null;
      this.listeners = new Set();
      this.initialized = false;
      this.destroyed = false;

      this.defaults = {
        enabled: true,
        muted: false,
        masterVolume: 0.7,
        musicVolume: 0.7,
        effectsVolume: 0.8,
        musicEnabled: true,
        effectsEnabled: true,
        autoplay: false,
        rememberPlayback: true,
        preferredPlaylistId: null
      };

      this.preferences = { ...this.defaults };
    }

    initialize() {
      this._assertAlive();

      if (this.initialized) {
        return this.getPreferences();
      }

      const saved = this._load();

      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        this.preferences = this._normalize({
          ...this.defaults,
          ...saved
        });
      }

      this._applyPreferences();
      this.initialized = true;

      this._emit("audio-preferences:initialized", {
        preferences: this.getPreferences()
      });

      return this.getPreferences();
    }

    getPreferences() {
      return { ...this.preferences };
    }

    get(key) {
      if (!Object.prototype.hasOwnProperty.call(this.preferences, key)) {
        return undefined;
      }

      return this.preferences[key];
    }

    set(key, value) {
      this._assertInitialized();

      if (!Object.prototype.hasOwnProperty.call(this.defaults, key)) {
        throw new Error("Unknown audio preference: " + key);
      }

      const next = this._normalize({
        ...this.preferences,
        [key]: value
      });

      if (Object.is(next[key], this.preferences[key])) {
        return this.get(key);
      }

      const previous = this.preferences[key];
      this.preferences = next;

      this._applyPreference(key);
      this._save();

      this._emit("audio-preferences:changed", {
        key,
        value: this.preferences[key],
        previous
      });

      return this.preferences[key];
    }

    update(changes) {
      this._assertInitialized();

      if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
        throw new TypeError("Preference updates must be an object.");
      }

      for (const key of Object.keys(changes)) {
        if (!Object.prototype.hasOwnProperty.call(this.defaults, key)) {
          throw new Error("Unknown audio preference: " + key);
        }
      }

      const previous = this.getPreferences();

      this.preferences = this._normalize({
        ...this.preferences,
        ...changes
      });

      this._applyPreferences();
      this._save();

      this._emit("audio-preferences:updated", {
        preferences: this.getPreferences(),
        previous
      });

      return this.getPreferences();
    }

    setMasterVolume(value) {
      return this.set("masterVolume", value);
    }

    setMusicVolume(value) {
      return this.set("musicVolume", value);
    }

    setEffectsVolume(value) {
      return this.set("effectsVolume", value);
    }

    setMuted(muted) {
      return this.set("muted", Boolean(muted));
    }

    setEnabled(enabled) {
      return this.set("enabled", Boolean(enabled));
    }

    setMusicEnabled(enabled) {
      return this.set("musicEnabled", Boolean(enabled));
    }

    setEffectsEnabled(enabled) {
      return this.set("effectsEnabled", Boolean(enabled));
    }

    setAutoplay(enabled) {
      return this.set("autoplay", Boolean(enabled));
    }

    setPreferredPlaylist(id) {
      if (id !== null && typeof id !== "string") {
        throw new TypeError("Playlist ID must be text or null.");
      }

      return this.set("preferredPlaylistId", id);
    }

    reset() {
      this._assertAlive();

      const previous = this.getPreferences();
      this.preferences = { ...this.defaults };

      this._applyPreferences();
      this._save();

      this._emit("audio-preferences:reset", {
        preferences: this.getPreferences(),
        previous
      });

      return this.getPreferences();
    }

    export() {
      return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        preferences: this.getPreferences()
      }, null, 2);
    }

    import(data) {
      this._assertInitialized();

      let parsed;

      try {
        parsed = typeof data === "string" ? JSON.parse(data) : data;
      } catch (_) {
        throw new TypeError("Invalid audio preferences data.");
      }

      const imported = parsed && parsed.preferences;

      if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
        throw new TypeError("Audio preferences are missing.");
      }

      return this.update(imported);
    }

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener must be a function.");
      }

      this.listeners.add(listener);

      return () => {
        this.listeners.delete(listener);
      };
    }

    _normalize(input) {
      const result = { ...this.defaults };

      result.enabled = Boolean(input.enabled);
      result.muted = Boolean(input.muted);
      result.musicEnabled = Boolean(input.musicEnabled);
      result.effectsEnabled = Boolean(input.effectsEnabled);
      result.autoplay = Boolean(input.autoplay);
      result.rememberPlayback = Boolean(input.rememberPlayback);

      result.masterVolume = this._clamp(input.masterVolume, 0, 1);
      result.musicVolume = this._clamp(input.musicVolume, 0, 1);
      result.effectsVolume = this._clamp(input.effectsVolume, 0, 1);

      result.preferredPlaylistId =
        typeof input.preferredPlaylistId === "string" &&
        input.preferredPlaylistId.trim()
          ? input.preferredPlaylistId.trim()
          : null;

      return result;
    }

    _applyPreferences() {
      for (const key of Object.keys(this.preferences)) {
        this._applyPreference(key);
      }
    }

    _applyPreference(key) {
      const preferences = this.preferences;

      if (!this.audioManager) {
        if (this.musicPlayer && key === "musicVolume") {
          this.musicPlayer.setVolume(
            preferences.enabled &&
            preferences.musicEnabled &&
            !preferences.muted
              ? preferences.musicVolume
              : 0
          );
        }

        return;
      }

      if (key === "enabled" && typeof this.audioManager.setEnabled === "function") {
        this.audioManager.setEnabled(preferences.enabled);
      }

      if (
        (key === "masterVolume" || key === "muted" || key === "enabled") &&
        typeof this.audioManager.setVolume === "function"
      ) {
        this.audioManager.setVolume(preferences.masterVolume);
      }

      if (typeof this.audioManager.setMuted === "function") {
        this.audioManager.setMuted(
          preferences.muted || !preferences.enabled
        );
      }

      if (key === "musicVolume" || key === "musicEnabled" ||
          key === "enabled" || key === "muted") {
        if (this.musicPlayer && typeof this.musicPlayer.setVolume === "function") {
          const effectiveVolume =
            preferences.enabled &&
            preferences.musicEnabled &&
            !preferences.muted
              ? preferences.musicVolume
              : 0;

          this.musicPlayer.setVolume(effectiveVolume);
        }
      }
    }

    _load() {
      try {
        if (this.storage && typeof this.storage.get === "function") {
          return this.storage.get(this.storageKey);
        }

        if (global.localStorage) {
          const raw = global.localStorage.getItem(this.storageKey);
          return raw ? JSON.parse(raw) : null;
        }
      } catch (error) {
        this._log("Unable to load audio preferences.", error);
      }

      return null;
    }

    _save() {
      try {
        if (this.storage && typeof this.storage.set === "function") {
          this.storage.set(this.storageKey, this.preferences);
          return true;
        }

        if (global.localStorage) {
          global.localStorage.setItem(
            this.storageKey,
            JSON.stringify(this.preferences)
          );

          return true;
        }
      } catch (error) {
        this._log("Unable to save audio preferences.", error);
      }

      return false;
    }

    _clamp(value, min, max) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return min;
      }

      return Math.min(max, Math.max(min, number));
    }

    _assertInitialized() {
      this._assertAlive();

      if (!this.initialized) {
        throw new Error("AudioPreferences has not been initialized.");
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("AudioPreferences has been destroyed.");
      }
    }

    _emit(type, detail) {
      const event = {
        type,
        detail,
        timestamp: Date.now()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          this._log("Audio preference listener failed.", error);
        }
      }
    }

    _log(message, error) {
      if (global.console && typeof global.console.warn === "function") {
        global.console.warn(message, error || "");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.listeners.clear();
      this.initialized = false;
      this.destroyed = true;
    }
  }

  global.SnakeAudioPreferences = AudioPreferences;
})(window);