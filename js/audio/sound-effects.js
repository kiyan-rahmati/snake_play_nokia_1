(function (global) {
  "use strict";

  class SnakeSoundEffects {
    constructor(options) {
      const settings = options || {};

      this.audioContext = null;
      this.masterVolume = this._clamp(settings.masterVolume ?? 0.8, 0, 1);
      this.enabled = settings.enabled !== false;
      this.muted = false;
      this.initialized = false;
      this.destroyed = false;
      this.activeNodes = new Set();
      this.listeners = new Set();
      this.masterGain = null;

      this.soundDefinitions = {
        food: {
          type: "sequence",
          notes: [
            { frequency: 520, duration: 0.07, wave: "square" },
            { frequency: 760, duration: 0.09, wave: "square" }
          ],
          volume: 0.18
        },
        bonus: {
          type: "sequence",
          notes: [
            { frequency: 440, duration: 0.08, wave: "triangle" },
            { frequency: 660, duration: 0.08, wave: "triangle" },
            { frequency: 880, duration: 0.13, wave: "triangle" }
          ],
          volume: 0.2
        },
        collision: {
          type: "tone",
          frequency: 110,
          endFrequency: 48,
          duration: 0.28,
          wave: "sawtooth",
          volume: 0.25
        },
        gameOver: {
          type: "sequence",
          notes: [
            { frequency: 440, duration: 0.14, wave: "triangle" },
            { frequency: 330, duration: 0.14, wave: "triangle" },
            { frequency: 220, duration: 0.28, wave: "triangle" }
          ],
          volume: 0.2
        },
        levelUp: {
          type: "sequence",
          notes: [
            { frequency: 523, duration: 0.1, wave: "triangle" },
            { frequency: 659, duration: 0.1, wave: "triangle" },
            { frequency: 784, duration: 0.1, wave: "triangle" },
            { frequency: 1046, duration: 0.18, wave: "triangle" }
          ],
          volume: 0.2
        },
        click: {
          type: "tone",
          frequency: 700,
          endFrequency: 540,
          duration: 0.045,
          wave: "square",
          volume: 0.08
        },
        start: {
          type: "sequence",
          notes: [
            { frequency: 392, duration: 0.1, wave: "triangle" },
            { frequency: 523, duration: 0.1, wave: "triangle" },
            { frequency: 659, duration: 0.16, wave: "triangle" }
          ],
          volume: 0.18
        },
        pause: {
          type: "tone",
          frequency: 440,
          endFrequency: 330,
          duration: 0.1,
          wave: "triangle",
          volume: 0.1
        },
        resume: {
          type: "tone",
          frequency: 330,
          endFrequency: 520,
          duration: 0.1,
          wave: "triangle",
          volume: 0.1
        },
        achievement: {
          type: "sequence",
          notes: [
            { frequency: 523, duration: 0.08, wave: "sine" },
            { frequency: 659, duration: 0.08, wave: "sine" },
            { frequency: 784, duration: 0.08, wave: "sine" },
            { frequency: 1046, duration: 0.22, wave: "sine" }
          ],
          volume: 0.2
        }
      };
    }

    initialize() {
      this._assertAlive();

      if (this.initialized) {
        return true;
      }

      const AudioContextClass =
        global.AudioContext || global.webkitAudioContext;

      if (!AudioContextClass) {
        this._emit("unavailable", {
          reason: "AudioContext is not supported."
        });

        return false;
      }

      try {
        this.audioContext = new AudioContextClass();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this._effectiveMasterVolume();
        this.masterGain.connect(this.audioContext.destination);
        this.initialized = true;

        this._emit("initialized", {});

        return true;
      } catch (error) {
        this._emit("error", {
          operation: "initialize",
          error
        });

        return false;
      }
    }

    async unlock() {
      this._assertAlive();

      if (!this.initialized && !this.initialize()) {
        return false;
      }

      try {
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        this._emit("unlocked", {
          state: this.audioContext.state
        });

        return this.audioContext.state === "running";
      } catch (error) {
        this._emit("error", {
          operation: "unlock",
          error
        });

        return false;
      }
    }

    play(name, options) {
      this._assertAlive();

      const settings = options || {};
      const definition = this.soundDefinitions[name];

      if (!definition) {
        this._emit("error", {
          operation: "play",
          reason: "Unknown sound effect.",
          name
        });

        return false;
      }

      if (!this.enabled || this.muted || this.masterVolume <= 0) {
        return false;
      }

      if (!this.initialized && !this.initialize()) {
        return false;
      }

      if (this.audioContext.state !== "running") {
        return false;
      }

      const volume = this._clamp(
        settings.volume ?? definition.volume,
        0,
        1
      );

      if (volume <= 0) {
        return false;
      }

      try {
        if (definition.type === "sequence") {
          this._playSequence(definition, volume, settings);
        } else {
          this._playTone(definition, volume, settings);
        }

        this._emit("played", {
          name,
          volume
        });

        return true;
      } catch (error) {
        this._emit("error", {
          operation: "play",
          name,
          error
        });

        return false;
      }
    }

    playFood(options) {
      return this.play("food", options);
    }

    playBonus(options) {
      return this.play("bonus", options);
    }

    playCollision(options) {
      return this.play("collision", options);
    }

    playGameOver(options) {
      return this.play("gameOver", options);
    }

    playLevelUp(options) {
      return this.play("levelUp", options);
    }

    playClick(options) {
      return this.play("click", options);
    }

    playStart(options) {
      return this.play("start", options);
    }

    playPause(options) {
      return this.play("pause", options);
    }

    playResume(options) {
      return this.play("resume", options);
    }

    playAchievement(options) {
      return this.play("achievement", options);
    }

    registerSound(name, definition) {
      this._assertAlive();

      if (typeof name !== "string" || !name.trim()) {
        throw new TypeError("Sound name must be a non-empty string.");
      }

      if (!definition || typeof definition !== "object") {
        throw new TypeError("Sound definition must be an object.");
      }

      if (definition.type === "sequence") {
        if (!Array.isArray(definition.notes) || definition.notes.length === 0) {
          throw new TypeError("Sequence sounds require at least one note.");
        }

        definition.notes.forEach((note) => {
          this._validateNote(note);
        });
      } else {
        this._validateNote(definition);
      }

      this.soundDefinitions[name] = {
        ...definition,
        volume: this._clamp(definition.volume ?? 0.15, 0, 1)
      };

      this._emit("sound-registered", { name });

      return true;
    }

    unregisterSound(name) {
      this._assertAlive();

      if (!Object.prototype.hasOwnProperty.call(this.soundDefinitions, name)) {
        return false;
      }

      delete this.soundDefinitions[name];

      this._emit("sound-unregistered", { name });

      return true;
    }

    setVolume(value) {
      this._assertAlive();

      this.masterVolume = this._clamp(value, 0, 1);
      this._updateMasterGain();

      this._emit("volume-changed", {
        volume: this.masterVolume
      });

      return this.masterVolume;
    }

    getVolume() {
      return this.masterVolume;
    }

    setEnabled(enabled) {
      this._assertAlive();

      this.enabled = Boolean(enabled);
      this._updateMasterGain();

      this._emit("enabled-changed", {
        enabled: this.enabled
      });

      return this.enabled;
    }

    isEnabled() {
      return this.enabled;
    }

    setMuted(muted) {
      this._assertAlive();

      this.muted = Boolean(muted);
      this._updateMasterGain();

      this._emit("mute-changed", {
        muted: this.muted
      });

      return this.muted;
    }

    isMuted() {
      return this.muted;
    }

    stopAll() {
      for (const node of this.activeNodes) {
        try {
          if (typeof node.stop === "function") {
            node.stop();
          }
        } catch (_) {
          // Nodes may already have stopped.
        }

        try {
          node.disconnect();
        } catch (_) {
          // Disconnection is best-effort.
        }
      }

      this.activeNodes.clear();

      this._emit("stopped-all", {});

      return true;
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

    _playSequence(definition, volume, options) {
      let startTime = this.audioContext.currentTime;
      const scheduledNodes = [];

      for (const note of definition.notes) {
        const node = this._createTone(
          note,
          volume,
          startTime,
          options
        );

        scheduledNodes.push(node);
        startTime += this._clamp(note.duration, 0.01, 3) +
          this._clamp(note.gap ?? 0.025, 0, 0.5);
      }

      return scheduledNodes;
    }

    _playTone(definition, volume, options) {
      return this._createTone(
        definition,
        volume,
        this.audioContext.currentTime,
        options
      );
    }

    _createTone(definition, volume, startTime, options) {
      const context = this.audioContext;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      const duration = this._clamp(definition.duration ?? 0.1, 0.01, 3);
      const frequency = this._clamp(definition.frequency ?? 440, 20, 20000);
      const endFrequency = this._clamp(
        definition.endFrequency ?? frequency,
        20,
        20000
      );

      const localVolume = this._clamp(
        volume * (definition.volume ?? 1),
        0,
        1
      );

      oscillator.type = this._validWave(definition.wave);
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        startTime + duration
      );

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, localVolume),
        startTime + Math.min(0.015, duration / 3)
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + duration
      );

      oscillator.connect(gain);
      gain.connect(this.masterGain);

      const record = {
        stop: () => oscillator.stop(),
        disconnect: () => {
          try {
            oscillator.disconnect();
          } catch (_) {}

          try {
            gain.disconnect();
          } catch (_) {}
        }
      };

      this.activeNodes.add(record);

      const cleanup = () => {
        this.activeNodes.delete(record);
        record.disconnect();
      };

      oscillator.addEventListener("ended", cleanup, { once: true });

      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.01);

      return record;
    }

    _validateNote(note) {
      if (!note || typeof note !== "object") {
        throw new TypeError("A sound note must be an object.");
      }

      if (
        note.frequency !== undefined &&
        (!Number.isFinite(Number(note.frequency)) ||
          Number(note.frequency) < 20 ||
          Number(note.frequency) > 20000)
      ) {
        throw new RangeError("Frequency must be between 20 and 20000 Hz.");
      }

      if (
        note.duration !== undefined &&
        (!Number.isFinite(Number(note.duration)) ||
          Number(note.duration) <= 0 ||
          Number(note.duration) > 3)
      ) {
        throw new RangeError("Duration must be greater than 0 and at most 3 seconds.");
      }

      if (
        note.endFrequency !== undefined &&
        (!Number.isFinite(Number(note.endFrequency)) ||
          Number(note.endFrequency) < 20 ||
          Number(note.endFrequency) > 20000)
      ) {
        throw new RangeError("End frequency must be between 20 and 20000 Hz.");
      }

      return true;
    }

    _validWave(wave) {
      const allowed = ["sine", "square", "triangle", "sawtooth"];

      return allowed.includes(wave) ? wave : "triangle";
    }

    _effectiveMasterVolume() {
      return this.enabled && !this.muted ? this.masterVolume : 0;
    }

    _updateMasterGain() {
      if (!this.masterGain || !this.audioContext) {
        return;
      }

      const target = this._effectiveMasterVolume();
      const now = this.audioContext.currentTime;

      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(target, now, 0.015);
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
            global.console.error("Sound effects listener failed.", error);
          }
        }
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeSoundEffects has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.stopAll();

      if (this.masterGain) {
        try {
          this.masterGain.disconnect();
        } catch (_) {}
      }

      if (this.audioContext && this.audioContext.state !== "closed") {
        this.audioContext.close().catch(() => {});
      }

      this.masterGain = null;
      this.audioContext = null;
      this.initialized = false;
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeSoundEffects = SnakeSoundEffects;
})(window);