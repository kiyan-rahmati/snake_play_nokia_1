(function (global) {
  "use strict";

  const SnakeCassetteControls = {
    root: null,
    view: null,
    audioManager: null,
    musicPlayer: null,
    cassetteController: null,
    playlistManager: null,
    initialized: false,
    subscriptions: [],
    handlers: {},

    init(options) {
      options = options || {};

      if (this.initialized) return this;

      this.root =
        options.root ||
        document.querySelector("[data-cassette-player]") ||
        document.querySelector(".cassette-player");

      this.view =
        options.view ||
        global.SnakeCassetteView ||
        null;

      this.audioManager =
        options.audioManager ||
        global.SnakeAudioManager ||
        null;

      this.musicPlayer =
        options.musicPlayer ||
        global.SnakeMusicPlayer ||
        null;

      this.cassetteController =
        options.cassetteController ||
        global.SnakeCassetteController ||
        null;

      this.playlistManager =
        options.playlistManager ||
        global.SnakePlaylistManager ||
        null;

      this.bindViewEvents();
      this.bindAudioEvents();
      this.bindKeyboard(options);
      this.initialized = true;

      return this;
    },

    bindViewEvents() {
      this.handlers.play = (event) => {
        this.play(event && event.detail);
      };

      this.handlers.pause = () => {
        this.pause();
      };

      this.handlers.previous = () => {
        this.previous();
      };

      this.handlers.next = () => {
        this.next();
      };

      this.handlers.seek = (event) => {
        const detail = event && event.detail;
        if (!detail) return;

        this.seek(detail.time);
      };

      this.handlers.volume = (event) => {
        const detail = event && event.detail;
        if (!detail) return;

        this.setVolume(detail.volume);
      };

      this.handlers.mute = (event) => {
        const detail = event && event.detail;
        if (!detail) return;

        this.setMuted(detail.muted);
      };

      this.handlers.shuffle = (event) => {
        const detail = event && event.detail;
        if (!detail) return;

        this.setShuffle(detail.shuffle);
      };

      this.handlers.repeat = (event) => {
        const detail = event && event.detail;
        if (!detail) return;

        this.setRepeat(detail.repeat);
      };

      this.listen("cassette:play-request", this.handlers.play);
      this.listen("cassette:pause-request", this.handlers.pause);
      this.listen("cassette:previous-request", this.handlers.previous);
      this.listen("cassette:next-request", this.handlers.next);
      this.listen("cassette:seek-request", this.handlers.seek);
      this.listen("cassette:volume-change", this.handlers.volume);
      this.listen("cassette:mute-change", this.handlers.mute);
      this.listen("cassette:shuffle-change", this.handlers.shuffle);
      this.listen("cassette:repeat-change", this.handlers.repeat);
    },

    bindAudioEvents() {
      this.handlers.audioPlay = () => {
        this.updateView({
          playing: true,
          paused: false,
          loading: false,
          error: null
        });
      };

      this.handlers.audioPause = () => {
        this.updateView({
          playing: false,
          paused: true,
          loading: false
        });
      };

      this.handlers.audioEnded = () => {
        this.handleTrackEnded();
      };

      this.handlers.audioTimeUpdate = (event) => {
        const detail = event && event.detail ? event.detail : {};
        const currentTime = Number(
          detail.currentTime ?? this.getCurrentTime()
        );

        const duration = Number(
          detail.duration ?? this.getDuration()
        );

        this.updateView({
          currentTime: this.validNumber(currentTime, 0),
          duration: this.validNumber(duration, 0)
        });
      };

      this.handlers.audioLoading = () => {
        this.updateView({
          loading: true,
          error: null
        });
      };

      this.handlers.audioReady = () => {
        this.updateView({
          loading: false,
          error: null,
          duration: this.getDuration()
        });
      };

      this.handlers.audioError = (event) => {
        const detail = event && event.detail ? event.detail : {};

        this.updateView({
          loading: false,
          playing: false,
          error: this.safeText(
            detail.message || detail.error || "Unable to play this track."
          )
        });
      };

      this.listen("snake-audio:play", this.handlers.audioPlay);
      this.listen("snake-audio:pause", this.handlers.audioPause);
      this.listen("snake-audio:ended", this.handlers.audioEnded);
      this.listen("snake-audio:timeupdate", this.handlers.audioTimeUpdate);
      this.listen("snake-audio:loading", this.handlers.audioLoading);
      this.listen("snake-audio:ready", this.handlers.audioReady);
      this.listen("snake-audio:error", this.handlers.audioError);
    },

    bindKeyboard(options) {
      if (options.keyboardControls === false) return;

      this.handlers.keydown = (event) => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }

        const target = event.target;

        if (
          target &&
          (
            target.isContentEditable ||
            /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName)
          )
        ) {
          return;
        }

        if (!this.root || !this.root.isConnected) return;

        switch (event.code) {
          case "Space":
            if (!this.isPlayerFocused()) return;

            event.preventDefault();

            if (this.isPlaying()) {
              this.pause();
            } else {
              this.play();
            }
            break;

          case "ArrowLeft":
            if (!this.isPlayerFocused()) return;
            event.preventDefault();
            this.seekRelative(-5);
            break;

          case "ArrowRight":
            if (!this.isPlayerFocused()) return;
            event.preventDefault();
            this.seekRelative(5);
            break;

          default:
            break;
        }
      };

      document.addEventListener("keydown", this.handlers.keydown);
    },

    isPlayerFocused() {
      if (!this.root) return false;

      const active = document.activeElement;

      return (
        active === this.root ||
        this.root.contains(active) ||
        this.root.hasAttribute("data-keyboard-active")
      );
    },

    play() {
      if (this.isPlaying()) {
        return Promise.resolve(true);
      }

      this.updateView({
        loading: true,
        error: null
      });

      return this.callFirst([
        [this.musicPlayer, "play"],
        [this.cassetteController, "play"],
        [this.audioManager, "playMusic"]
      ]).then((result) => {
        if (result === undefined) {
          this.updateView({
            loading: false,
            error: "Playback is not available."
          });

          return false;
        }

        this.updateView({
          playing: true,
          paused: false,
          loading: false,
          error: null
        });

        return true;
      }).catch((error) => {
        this.updateView({
          playing: false,
          loading: false,
          error: this.safeText(
            error && error.message || "Unable to start playback."
          )
        });

        return false;
      });
    },

    pause() {
      return this.callFirst([
        [this.musicPlayer, "pause"],
        [this.cassetteController, "pause"],
        [this.audioManager, "pauseMusic"]
      ]).then((result) => {
        if (result === undefined) return false;

        this.updateView({
          playing: false,
          paused: true,
          loading: false
        });

        return true;
      }).catch((error) => {
        this.reportError("pause", error);
        return false;
      });
    },

    stop() {
      return this.callFirst([
        [this.musicPlayer, "stop"],
        [this.cassetteController, "stop"],
        [this.audioManager, "stopMusic"]
      ]).then((result) => {
        if (result === undefined) return false;

        this.updateView({
          playing: false,
          paused: false,
          currentTime: 0,
          loading: false
        });

        return true;
      }).catch((error) => {
        this.reportError("stop", error);
        return false;
      });
    },

    previous() {
      return this.callFirst([
        [this.playlistManager, "previous"],
        [this.musicPlayer, "previous"],
        [this.cassetteController, "previousTrack"],
        [this.audioManager, "previousTrack"]
      ]).then((result) => {
        if (result === undefined) return false;

        this.syncCurrentTrack();
        return true;
      }).catch((error) => {
        this.reportError("previous", error);
        return false;
      });
    },

    next() {
      return this.callFirst([
        [this.playlistManager, "next"],
        [this.musicPlayer, "next"],
        [this.cassetteController, "nextTrack"],
        [this.audioManager, "nextTrack"]
      ]).then((result) => {
        if (result === undefined) return false;

        this.syncCurrentTrack();
        return true;
      }).catch((error) => {
        this.reportError("next", error);
        return false;
      });
    },

    seek(time) {
      const target = Number(time);

      if (!Number.isFinite(target) || target < 0) {
        return Promise.resolve(false);
      }

      return this.callFirst([
        [this.musicPlayer, "seek"],
        [this.cassetteController, "seek"],
        [this.audioManager, "seekMusic"]
      ], [target]).then((result) => {
        if (result === undefined) return false;

        this.updateView({
          currentTime: target
        });

        return true;
      }).catch((error) => {
        this.reportError("seek", error);
        return false;
      });
    },

    seekRelative(offset) {
      const amount = Number(offset);

      if (!Number.isFinite(amount)) return Promise.resolve(false);

      const target = Math.max(
        0,
        Math.min(
          this.getDuration() || Infinity,
          this.getCurrentTime() + amount
        )
      );

      return this.seek(target);
    },

    setVolume(volume) {
      const value = Number(volume);

      if (!Number.isFinite(value)) return Promise.resolve(false);

      const normalized = Math.max(0, Math.min(1, value));

      return this.callFirst([
        [this.audioManager, "setMusicVolume"],
        [this.musicPlayer, "setVolume"],
        [this.cassetteController, "setVolume"]
      ], [normalized]).then((result) => {
        if (result === undefined) return false;

        this.updateView({
          volume: normalized,
          muted: normalized === 0
        });

        return true;
      }).catch((error) => {
        this.reportError("volume", error);
        return false;
      });
    },

    setMuted(muted) {
      const value = Boolean(muted);

      return this.callFirst([
        [this.audioManager, "setMusicMuted"],
        [this.musicPlayer, "setMuted"],
        [this.cassetteController, "setMuted"]
      ], [value]).then((result) => {
        if (result === undefined) return false;

        this.updateView({
          muted: value
        });

        return true;
      }).catch((error) => {
        this.reportError("mute", error);
        return false;
      });
    },

    setShuffle(enabled) {
      const value = Boolean(enabled);

      return this.callFirst([
        [this.playlistManager, "setShuffle"],
        [this.musicPlayer, "setShuffle"],
        [this.cassetteController, "setShuffle"]
      ], [value]).then((result) => {
        if (result === undefined) return false;

        this.updateView({
          shuffle: value
        });

        return true;
      }).catch((error) => {
        this.reportError("shuffle", error);
        return false;
      });
    },

    setRepeat(mode) {
      const allowed = ["off", "all", "one"];
      const value = allowed.includes(mode) ? mode : "off";

      return this.callFirst([
        [this.playlistManager, "setRepeat"],
        [this.musicPlayer, "setRepeat"],
        [this.cassetteController, "setRepeat"]
      ], [value]).then((result) => {
        if (result === undefined) return false;

        this.updateView({
          repeat: value
        });

        return true;
      }).catch((error) => {
        this.reportError("repeat", error);
        return false;
      });
    },

    handleTrackEnded() {
      if (this.getRepeatMode() === "one") {
        this.seek(0).then(() => this.play());
        return;
      }

      if (this.getRepeatMode() === "all" || this.hasNextTrack()) {
        this.next();
        return;
      }

      this.updateView({
        playing: false,
        paused: false,
        currentTime: this.getDuration()
      });
    },

    syncCurrentTrack() {
      const track = this.getCurrentTrack();

      if (track && this.view && typeof this.view.setTrack === "function") {
        this.view.setTrack(track);
      }

      this.updateView({
        playing: this.isPlaying(),
        paused: false,
        loading: false,
        currentTime: this.getCurrentTime(),
        duration: this.getDuration()
      });
    },

    getCurrentTrack() {
      const sources = [
        this.musicPlayer,
        this.cassetteController,
        this.playlistManager
      ];

      for (const source of sources) {
        if (!source) continue;

        if (typeof source.getCurrentTrack === "function") {
          const track = source.getCurrentTrack();
          if (track) return track;
        }

        if (source.currentTrack) return source.currentTrack;

        if (source.state && source.state.track) {
          return source.state.track;
        }
      }

      return null;
    },

    getCurrentTime() {
      const sources = [
        this.musicPlayer,
        this.cassetteController,
        this.audioManager
      ];

      for (const source of sources) {
        if (!source) continue;

        if (typeof source.getCurrentTime === "function") {
          const value = Number(source.getCurrentTime());

          if (Number.isFinite(value)) return Math.max(0, value);
        }

        if (source.audio && Number.isFinite(source.audio.currentTime)) {
          return Math.max(0, source.audio.currentTime);
        }
      }

      return 0;
    },

    getDuration() {
      const sources = [
        this.musicPlayer,
        this.cassetteController,
        this.audioManager
      ];

      for (const source of sources) {
        if (!source) continue;

        if (typeof source.getDuration === "function") {
          const value = Number(source.getDuration());

          if (Number.isFinite(value) && value > 0) return value;
        }

        if (
          source.audio &&
          Number.isFinite(source.audio.duration) &&
          source.audio.duration > 0
        ) {
          return source.audio.duration;
        }
      }

      return 0;
    },

    isPlaying() {
      const sources = [
        this.musicPlayer,
        this.cassetteController,
        this.audioManager
      ];

      for (const source of sources) {
        if (!source) continue;

        if (typeof source.isPlaying === "function") {
          return Boolean(source.isPlaying());
        }

        if (typeof source.playing === "boolean") {
          return source.playing;
        }

        if (source.state && typeof source.state.playing === "boolean") {
          return source.state.playing;
        }
      }

      return false;
    },

    hasNextTrack() {
      if (
        this.playlistManager &&
        typeof this.playlistManager.hasNext === "function"
      ) {
        return Boolean(this.playlistManager.hasNext());
      }

      return false;
    },

    getRepeatMode() {
      const sources = [
        this.playlistManager,
        this.musicPlayer,
        this.cassetteController
      ];

      for (const source of sources) {
        if (!source) continue;

        if (typeof source.getRepeat === "function") {
          return source.getRepeat();
        }

        if (typeof source.repeat === "string") {
          return source.repeat;
        }

        if (source.state && typeof source.state.repeat === "string") {
          return source.state.repeat;
        }
      }

      return "off";
    },

    updateView(state) {
      if (!this.view) return;

      if (typeof this.view.setPlaybackState === "function") {
        this.view.setPlaybackState(state);
        return;
      }

      if (typeof this.view.update === "function") {
        Object.assign(this.view.state || {}, state);
        this.view.update();
      }
    },

    callFirst(candidates, args) {
      args = Array.isArray(args) ? args : [];

      for (const candidate of candidates) {
        const target = candidate[0];
        const method = candidate[1];

        if (target && typeof target[method] === "function") {
          try {
            return Promise.resolve(target[method].apply(target, args));
          } catch (error) {
            return Promise.reject(error);
          }
        }
      }

      return Promise.resolve(undefined);
    },

    listen(name, handler) {
      global.addEventListener(name, handler);

      this.subscriptions.push({
        target: global,
        name,
        handler
      });
    },

    validNumber(value, fallback) {
      const number = Number(value);

      return Number.isFinite(number) && number >= 0
        ? number
        : fallback;
    },

    safeText(value) {
      return String(value ?? "").slice(0, 500);
    },

    reportError(action, error) {
      if (
        global.SnakeLogger &&
        typeof global.SnakeLogger.error === "function"
      ) {
        global.SnakeLogger.error(
          "Cassette control failed: " + action,
          error
        );
      }
    },

    destroy() {
      this.subscriptions.forEach((subscription) => {
        subscription.target.removeEventListener(
          subscription.name,
          subscription.handler
        );
      });

      this.subscriptions = [];

      if (this.handlers.keydown) {
        document.removeEventListener("keydown", this.handlers.keydown);
      }

      this.handlers = {};
      this.root = null;
      this.view = null;
      this.audioManager = null;
      this.musicPlayer = null;
      this.cassetteController = null;
      this.playlistManager = null;
      this.initialized = false;
    }
  };

  global.SnakeCassetteControls = SnakeCassetteControls;
})(window);