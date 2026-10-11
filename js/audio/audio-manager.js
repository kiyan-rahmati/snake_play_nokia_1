(function (global) {
  "use strict";

  class AudioManager {
    constructor(options) {
      const settings = options || {};

      this.basePath = settings.basePath || "assets/audio/";
      this.defaultVolume = this._clamp(settings.volume ?? 0.7, 0, 1);
      this.muted = Boolean(settings.muted);
      this.enabled = settings.enabled !== false;

      this.audioContext = null;
      this.masterGain = null;
      this.tracks = new Map();
      this.activeSources = new Set();
      this.listeners = new Set();

      this.initialized = false;
      this.unlocked = false;
      this.destroyed = false;
    }

    async initialize() {
      if (this.destroyed) {
        throw new Error("AudioManager has been destroyed.");
      }

      if (this.initialized) {
        return this;
      }

      const AudioContextClass =
        global.AudioContext || global.webkitAudioContext;

      if (AudioContextClass) {
        try {
          this.audioContext = new AudioContextClass();
          this.masterGain = this.audioContext.createGain();
          this.masterGain.gain.value = this.muted
            ? 0
            : this.defaultVolume;

          this.masterGain.connect(this.audioContext.destination);
        } catch (error) {
          this._emit("audio:error", { error });
          this.audioContext = null;
          this.masterGain = null;
        }
      }

      this.initialized = true;
      this._emit("audio:initialized", {
        supported: Boolean(this.audioContext)
      });

      return this;
    }

    async unlock() {
      if (!this.enabled || this.destroyed) {
        return false;
      }

      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.audioContext) {
        this.unlocked = true;
        return false;
      }

      try {
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        this.unlocked = this.audioContext.state === "running";
        this._emit("audio:unlocked", {
          unlocked: this.unlocked
        });

        return this.unlocked;
      } catch (error) {
        this._emit("audio:error", { error });
        return false;
      }
    }

    registerTrack(name, source, options) {
      this._assertAlive();

      if (typeof name !== "string" || !name.trim()) {
        throw new TypeError("Track name is required.");
      }

      if (typeof source !== "string" || !source.trim()) {
        throw new TypeError("Track source is required.");
      }

      const settings = options || {};

      this.tracks.set(name, {
        name,
        source: this._resolvePath(source),
        loop: settings.loop !== false,
        volume: this._clamp(settings.volume ?? 1, 0, 1),
        preload: settings.preload || "none",
        element: null,
        loaded: false,
        playing: false
      });

      this._emit("audio:track-registered", { name });

      return this.getTrack(name);
    }

    async loadTrack(name) {
      this._assertAlive();

      const track = this.tracks.get(name);

      if (!track) {
        throw new Error("Unknown audio track: " + name);
      }

      if (track.loaded && track.element) {
        return track.element;
      }

      const audio = new Audio();

      audio.preload = track.preload;
      audio.loop = track.loop;
      audio.volume = this.muted
        ? 0
        : this._clamp(this.defaultVolume * track.volume, 0, 1);
      audio.src = track.source;

      audio.addEventListener("ended", () => {
        track.playing = false;
        this._emit("audio:track-ended", { name });
      });

      audio.addEventListener("error", () => {
        track.playing = false;
        this._emit("audio:track-error", {
          name,
          source: track.source
        });
      });

      track.element = audio;
      track.loaded = true;

      this._emit("audio:track-loaded", { name });

      return audio;
    }

    async playTrack(name, options) {
      this._assertAlive();

      if (!this.enabled) {
        return false;
      }

      const track = this.tracks.get(name);

      if (!track) {
        throw new Error("Unknown audio track: " + name);
      }

      const settings = options || {};
      const audio = await this.loadTrack(name);

      if (settings.restart) {
        audio.currentTime = 0;
      }

      if (typeof settings.loop === "boolean") {
        audio.loop = settings.loop;
      }

      if (typeof settings.volume === "number") {
        track.volume = this._clamp(settings.volume, 0, 1);
      }

      audio.volume = this.muted
        ? 0
        : this._clamp(this.defaultVolume * track.volume, 0, 1);

      try {
        await audio.play();

        track.playing = true;
        this._emit("audio:track-playing", { name });

        return true;
      } catch (error) {
        track.playing = false;

        this._emit("audio:play-blocked", {
          name,
          error
        });

        return false;
      }
    }

    pauseTrack(name) {
      const track = this.tracks.get(name);

      if (!track || !track.element) {
        return false;
      }

      track.element.pause();
      track.playing = false;

      this._emit("audio:track-paused", { name });

      return true;
    }

    stopTrack(name) {
      const track = this.tracks.get(name);

      if (!track || !track.element) {
        return false;
      }

      track.element.pause();

      try {
        track.element.currentTime = 0;
      } catch (_) {
        // Some media sources cannot seek before metadata loads.
      }

      track.playing = false;

      this._emit("audio:track-stopped", { name });

      return true;
    }

    async playSound(source, options) {
      this._assertAlive();

      if (!this.enabled || this.muted) {
        return false;
      }

      const settings = options || {};
      const volume = this._clamp(
        settings.volume ?? 1,
        0,
        1
      );

      const audio = new Audio(this._resolvePath(source));

      audio.preload = "auto";
      audio.loop = false;
      audio.volume = this._clamp(
        this.defaultVolume * volume,
        0,
        1
      );

      if (Number.isFinite(settings.playbackRate)) {
        audio.playbackRate = this._clamp(
          settings.playbackRate,
          0.25,
          4
        );
      }

      this.activeSources.add(audio);

      const cleanup = () => {
        this.activeSources.delete(audio);
        audio.removeEventListener("ended", cleanup);
        audio.removeEventListener("error", cleanup);
      };

      audio.addEventListener("ended", cleanup);
      audio.addEventListener("error", cleanup);

      try {
        await audio.play();
        this._emit("audio:sound-playing", { source });
        return true;
      } catch (error) {
        cleanup();

        this._emit("audio:play-blocked", {
          source,
          error
        });

        return false;
      }
    }

    setVolume(volume) {
      this.defaultVolume = this._clamp(volume, 0, 1);

      if (this.masterGain && this.audioContext) {
        this.masterGain.gain.setTargetAtTime(
          this.muted ? 0 : this.defaultVolume,
          this.audioContext.currentTime,
          0.015
        );
      }

      for (const track of this.tracks.values()) {
        if (track.element) {
          track.element.volume = this.muted
            ? 0
            : this._clamp(
                this.defaultVolume * track.volume,
                0,
                1
              );
        }
      }

      for (const audio of this.activeSources) {
        audio.volume = this.muted
          ? 0
          : this._clamp(this.defaultVolume, 0, 1);
      }

      this._emit("audio:volume-changed", {
        volume: this.defaultVolume
      });

      return this.defaultVolume;
    }

    getVolume() {
      return this.defaultVolume;
    }

    setMuted(muted) {
      this.muted = Boolean(muted);

      if (this.masterGain && this.audioContext) {
        this.masterGain.gain.setTargetAtTime(
          this.muted ? 0 : this.defaultVolume,
          this.audioContext.currentTime,
          0.015
        );
      }

      for (const track of this.tracks.values()) {
        if (track.element) {
          track.element.volume = this.muted
            ? 0
            : this._clamp(
                this.defaultVolume * track.volume,
                0,
                1
              );
        }
      }

      for (const audio of this.activeSources) {
        audio.volume = this.muted
          ? 0
          : this.defaultVolume;
      }

      this._emit("audio:mute-changed", {
        muted: this.muted
      });

      return this.muted;
    }

    isMuted() {
      return this.muted;
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);

      if (!this.enabled) {
        this.stopAll();
      }

      this._emit("audio:enabled-changed", {
        enabled: this.enabled
      });

      return this.enabled;
    }

    stopAll() {
      for (const name of this.tracks.keys()) {
        this.stopTrack(name);
      }

      for (const audio of this.activeSources) {
        audio.pause();

        try {
          audio.currentTime = 0;
        } catch (_) {
          // Ignore unseekable sources.
        }
      }

      this.activeSources.clear();

      this._emit("audio:all-stopped", {});
    }

    getTrack(name) {
      const track = this.tracks.get(name);

      if (!track) {
        return null;
      }

      return {
        name: track.name,
        source: track.source,
        loop: track.loop,
        volume: track.volume,
        loaded: track.loaded,
        playing: track.playing
      };
    }

    getTracks() {
      return Array.from(this.tracks.keys()).map((name) => {
        return this.getTrack(name);
      });
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

    _resolvePath(source) {
      if (/^(https?:|blob:|data:)/i.test(source)) {
        return source;
      }

      return this.basePath + source.replace(/^\/+/, "");
    }

    _clamp(value, min, max) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return min;
      }

      return Math.min(max, Math.max(min, number));
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("AudioManager has been destroyed.");
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
          if (global.console && global.console.error) {
            global.console.error("Audio event listener failed.", error);
          }
        }
      }
    }

    async destroy() {
      if (this.destroyed) {
        return;
      }

      this.stopAll();

      for (const track of this.tracks.values()) {
        if (track.element) {
          track.element.removeAttribute("src");
          track.element.load();
          track.element = null;
        }
      }

      this.tracks.clear();
      this.listeners.clear();

      if (this.audioContext) {
        try {
          await this.audioContext.close();
        } catch (_) {
          // Ignore errors during audio context cleanup.
        }
      }

      this.audioContext = null;
      this.masterGain = null;
      this.initialized = false;
      this.unlocked = false;
      this.destroyed = true;
    }
  }

  global.SnakeAudioManager = AudioManager;
})(window);