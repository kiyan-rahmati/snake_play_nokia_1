(function (global) {
  "use strict";

  class VolumeController {
    constructor(options) {
      const settings = options || {};

      this.audioManager = settings.audioManager || null;
      this.musicPlayer = settings.musicPlayer || null;
      this.root = settings.root || null;

      this.volume = this._clamp(settings.volume ?? 0.7, 0, 1);
      this.previousVolume = this.volume;
      this.muted = false;
      this.listeners = new Set();
      this.bound = false;
      this.destroyed = false;
      this.unsubscribe = [];

      this.selectors = {
        master: "[data-volume-master]",
        music: "[data-volume-music]",
        effects: "[data-volume-effects]",
        mute: "[data-volume-mute]",
        decrease: "[data-volume-decrease]",
        increase: "[data-volume-increase]",
        value: "[data-volume-value]",
        ...(settings.selectors || {})
      };

      this._onInput = this._handleInput.bind(this);
      this._onChange = this._handleChange.bind(this);
      this._onClick = this._handleClick.bind(this);
    }

    initialize() {
      this._assertAlive();

      if (this.bound) {
        return this;
      }

      this.root = this.root || document;

      this.root.addEventListener("input", this._onInput);
      this.root.addEventListener("change", this._onChange);
      this.root.addEventListener("click", this._onClick);

      if (
        this.audioManager &&
        typeof this.audioManager.subscribe === "function"
      ) {
        this.unsubscribe.push(
          this.audioManager.subscribe(() => this.render())
        );
      }

      if (
        this.musicPlayer &&
        typeof this.musicPlayer.subscribe === "function"
      ) {
        this.unsubscribe.push(
          this.musicPlayer.subscribe(() => this.render())
        );
      }

      this.bound = true;
      this.render();

      return this;
    }

    _handleInput(event) {
      const target = event.target;

      if (target.matches(this.selectors.master)) {
        this.setMasterVolume(this._readRange(target));
      } else if (target.matches(this.selectors.music)) {
        this.setMusicVolume(this._readRange(target));
      } else if (target.matches(this.selectors.effects)) {
        this._emit("volume:effects-requested", {
          volume: this._readRange(target)
        });
      }
    }

    _handleChange(event) {
      const target = event.target;

      if (
        target.matches(this.selectors.master) ||
        target.matches(this.selectors.music)
      ) {
        this.render();
      } else if (target.matches(this.selectors.effects)) {
        this._emit("volume:effects-changed", {
          volume: this._readRange(target)
        });
      }
    }

    _handleClick(event) {
      const target = event.target.closest(
        [
          this.selectors.mute,
          this.selectors.decrease,
          this.selectors.increase
        ].join(",")
      );

      if (!target || !this.root.contains(target)) {
        return;
      }

      if (target.matches(this.selectors.mute)) {
        this.toggleMute();
      } else if (target.matches(this.selectors.decrease)) {
        this.setMasterVolume(this.volume - 0.1);
      } else if (target.matches(this.selectors.increase)) {
        this.setMasterVolume(this.volume + 0.1);
      }
    }

    setMasterVolume(value) {
      this._assertAlive();

      const next = this._clamp(value, 0, 1);

      if (next > 0) {
        this.previousVolume = next;
      }

      this.volume = next;

      if (next > 0 && this.muted) {
        this.muted = false;
      }

      if (
        this.audioManager &&
        typeof this.audioManager.setVolume === "function"
      ) {
        this.audioManager.setVolume(next);
      }

      if (
        this.audioManager &&
        typeof this.audioManager.setMuted === "function"
      ) {
        this.audioManager.setMuted(this.muted);
      }

      if (
        this.musicPlayer &&
        typeof this.musicPlayer.setVolume === "function"
      ) {
        this.musicPlayer.setVolume(this.muted ? 0 : next);
      }

      this.render();

      this._emit("volume:master-changed", {
        volume: this.volume,
        muted: this.muted
      });

      return this.volume;
    }

    setMusicVolume(value) {
      this._assertAlive();

      const next = this._clamp(value, 0, 1);

      if (
        this.musicPlayer &&
        typeof this.musicPlayer.setVolume === "function"
      ) {
        this.musicPlayer.setVolume(next);
      }

      this._emit("volume:music-changed", {
        volume: next
      });

      this.render();

      return next;
    }

    setEffectsVolume(value) {
      this._assertAlive();

      const next = this._clamp(value, 0, 1);

      this._emit("volume:effects-changed", {
        volume: next
      });

      return next;
    }

    toggleMute() {
      this._assertAlive();

      if (!this.muted && this.volume > 0) {
        this.previousVolume = this.volume;
        this.muted = true;
      } else {
        this.muted = false;
        this.volume = this.previousVolume || 0.7;
      }

      if (
        this.audioManager &&
        typeof this.audioManager.setMuted === "function"
      ) {
        this.audioManager.setMuted(this.muted);
      }

      if (
        this.audioManager &&
        typeof this.audioManager.setVolume === "function"
      ) {
        this.audioManager.setVolume(this.volume);
      }

      if (
        this.musicPlayer &&
        typeof this.musicPlayer.setVolume === "function"
      ) {
        this.musicPlayer.setVolume(this.muted ? 0 : this.volume);
      }

      this.render();

      this._emit("volume:mute-changed", {
        muted: this.muted,
        volume: this.volume
      });

      return this.muted;
    }

    setMuted(muted) {
      this._assertAlive();

      const shouldMute = Boolean(muted);

      if (shouldMute === this.muted) {
        return this.muted;
      }

      return this.toggleMute();
    }

    getMasterVolume() {
      return this.volume;
    }

    getMusicVolume() {
      if (
        this.musicPlayer &&
        typeof this.musicPlayer.getVolume === "function"
      ) {
        return this.musicPlayer.getVolume();
      }

      return this.volume;
    }

    isMuted() {
      return this.muted;
    }

    render() {
      if (!this.root) {
        return;
      }

      this._renderRange(this.selectors.master, this.volume);
      this._renderRange(
        this.selectors.music,
        this.getMusicVolume()
      );

      const muteButtons = this.root.querySelectorAll(
        this.selectors.mute
      );

      for (const button of muteButtons) {
        button.setAttribute("aria-pressed", String(this.muted));
        button.setAttribute(
          "aria-label",
          this.muted ? "Unmute audio" : "Mute audio"
        );
      }

      const valueElements = this.root.querySelectorAll(
        this.selectors.value
      );

      for (const element of valueElements) {
        element.textContent = Math.round(this.volume * 100) + "%";
      }
    }

    _renderRange(selector, value) {
      const elements = this.root.querySelectorAll(selector);

      for (const element of elements) {
        const min = Number(element.min || 0);
        const max = Number(element.max || 100);
        const normalized = this._clamp(value, 0, 1);

        element.value = min + normalized * (max - min);
        element.setAttribute(
          "aria-valuetext",
          Math.round(normalized * 100) + "%"
        );
      }
    }

    _readRange(element) {
      const min = Number(element.min || 0);
      const max = Number(element.max || 100);
      const value = Number(element.value);

      if (!Number.isFinite(value) || max <= min) {
        return 0;
      }

      return this._clamp((value - min) / (max - min), 0, 1);
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

    _clamp(value, min, max) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return min;
      }

      return Math.min(max, Math.max(min, number));
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
          if (global.console && typeof global.console.error === "function") {
            global.console.error("VolumeController listener failed.", error);
          }
        }
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("VolumeController has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.root && this.bound) {
        this.root.removeEventListener("input", this._onInput);
        this.root.removeEventListener("change", this._onChange);
        this.root.removeEventListener("click", this._onClick);
      }

      for (const unsubscribe of this.unsubscribe) {
        try {
          unsubscribe();
        } catch (_) {
          // Ignore cleanup failures.
        }
      }

      this.unsubscribe = [];
      this.listeners.clear();
      this.root = null;
      this.bound = false;
      this.destroyed = true;
    }
  }

  global.SnakeVolumeController = VolumeController;
})(window);