(function (global) {
  "use strict";

  class MusicPlayer {
    constructor(options) {
      const settings = options || {};

      this.audioManager = settings.audioManager || null;
      this.playlistManager = settings.playlistManager || null;
      this.tracks = [];
      this.currentIndex = -1;
      this.currentTrack = null;
      this.playing = false;
      this.paused = false;
      this.shuffle = false;
      this.repeatMode = "all";
      this.volume = this._clamp(settings.volume ?? 0.7, 0, 1);
      this.listeners = new Set();
      this.audioElement = null;
      this.destroyed = false;
      this.generation = 0;

      this._onEnded = this._handleEnded.bind(this);
      this._onError = this._handleError.bind(this);
      this._onTimeUpdate = this._handleTimeUpdate.bind(this);
    }

    initialize() {
      this._assertAlive();

      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.preload = "metadata";

        this.audioElement.addEventListener("ended", this._onEnded);
        this.audioElement.addEventListener("error", this._onError);
        this.audioElement.addEventListener(
          "timeupdate",
          this._onTimeUpdate
        );

        this.audioElement.volume = this.volume;
      }

      this._emit("music:initialized", {});
      return this;
    }

    setPlaylist(tracks, options) {
      this._assertAlive();

      if (!Array.isArray(tracks)) {
        throw new TypeError("Playlist must be an array.");
      }

      const settings = options || {};
      const normalized = tracks
        .map((track, index) => this._normalizeTrack(track, index))
        .filter(Boolean);

      this.stop();

      this.tracks = normalized;
      this.currentIndex = -1;
      this.currentTrack = null;

      if (settings.startIndex !== undefined && normalized.length) {
        const index = Number(settings.startIndex);

        if (
          Number.isInteger(index) &&
          index >= 0 &&
          index < normalized.length
        ) {
          this.currentIndex = index;
          this.currentTrack = normalized[index];
        }
      }

      this._emit("music:playlist-changed", {
        tracks: this.getPlaylist(),
        count: this.tracks.length
      });

      return this.getPlaylist();
    }

    addTrack(track) {
      this._assertAlive();

      const normalized = this._normalizeTrack(track, this.tracks.length);

      if (!normalized) {
        throw new TypeError("Invalid music track.");
      }

      this.tracks.push(normalized);

      this._emit("music:track-added", {
        track: this._copyTrack(normalized)
      });

      return this._copyTrack(normalized);
    }

    removeTrack(index) {
      this._assertAlive();

      if (!Number.isInteger(index) || index < 0 || index >= this.tracks.length) {
        return false;
      }

      const wasCurrent = index === this.currentIndex;

      if (wasCurrent) {
        this.stop();
      }

      const removed = this.tracks.splice(index, 1)[0];

      if (this.currentIndex > index) {
        this.currentIndex -= 1;
      } else if (wasCurrent) {
        this.currentIndex = -1;
        this.currentTrack = null;
      }

      this._emit("music:track-removed", {
        track: this._copyTrack(removed),
        index
      });

      return true;
    }

    async play(index) {
      this._assertAlive();
      this.initialize();

      if (!this.tracks.length) {
        this._emit("music:empty-playlist", {});
        return false;
      }

      if (index !== undefined) {
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= this.tracks.length
        ) {
          return false;
        }

        this.currentIndex = index;
      } else if (this.currentIndex < 0) {
        this.currentIndex = this.shuffle
          ? this._randomIndex(-1)
          : 0;
      }

      const track = this.tracks[this.currentIndex];

      if (!track || !track.src) {
        return false;
      }

      const requestGeneration = ++this.generation;

      this.audioElement.pause();
      this.audioElement.src = track.src;
      this.audioElement.loop = this.repeatMode === "one";
      this.audioElement.volume = this.volume;
      this.currentTrack = track;
      this.paused = false;

      try {
        await this.audioElement.play();

        if (requestGeneration !== this.generation || this.destroyed) {
          this.audioElement.pause();
          return false;
        }

        this.playing = true;

        this._emit("music:playing", {
          track: this.getCurrentTrack(),
          index: this.currentIndex
        });

        return true;
      } catch (error) {
        this.playing = false;
        this.paused = false;

        this._emit("music:play-blocked", {
          track: this.getCurrentTrack(),
          error
        });

        return false;
      }
    }

    pause() {
      this._assertAlive();

      if (!this.audioElement || !this.playing) {
        return false;
      }

      this.audioElement.pause();
      this.playing = false;
      this.paused = true;

      this._emit("music:paused", {
        track: this.getCurrentTrack(),
        currentTime: this.getCurrentTime()
      });

      return true;
    }

    async resume() {
      this._assertAlive();

      if (!this.audioElement || !this.currentTrack) {
        return this.play();
      }

      if (!this.paused) {
        return false;
      }

      try {
        await this.audioElement.play();

        this.playing = true;
        this.paused = false;

        this._emit("music:resumed", {
          track: this.getCurrentTrack()
        });

        return true;
      } catch (error) {
        this._emit("music:play-blocked", {
          track: this.getCurrentTrack(),
          error
        });

        return false;
      }
    }

    stop() {
      this.generation += 1;

      if (this.audioElement) {
        this.audioElement.pause();

        try {
          this.audioElement.currentTime = 0;
        } catch (_) {
          // Metadata may not have loaded yet.
        }

        this.audioElement.removeAttribute("src");
        this.audioElement.load();
      }

      const hadPlayback = this.playing || this.paused;

      this.playing = false;
      this.paused = false;

      if (hadPlayback) {
        this._emit("music:stopped", {
          track: this.getCurrentTrack()
        });
      }

      return true;
    }

    async next() {
      this._assertAlive();

      if (!this.tracks.length) {
        return false;
      }

      if (this.repeatMode === "one" && this.currentIndex >= 0) {
        return this.play(this.currentIndex);
      }

      const nextIndex = this.shuffle
        ? this._randomIndex(this.currentIndex)
        : (this.currentIndex + 1) % this.tracks.length;

      if (
        this.repeatMode === "none" &&
        !this.shuffle &&
        this.currentIndex === this.tracks.length - 1
      ) {
        this.stop();
        this._emit("music:playlist-ended", {});
        return false;
      }

      return this.play(nextIndex);
    }

    async previous() {
      this._assertAlive();

      if (!this.tracks.length) {
        return false;
      }

      if (this.getCurrentTime() > 3 && this.audioElement) {
        this.audioElement.currentTime = 0;
        return true;
      }

      const previousIndex = this.shuffle
        ? this._randomIndex(this.currentIndex)
        : (
            this.currentIndex - 1 + this.tracks.length
          ) % this.tracks.length;

      return this.play(previousIndex);
    }

    seek(seconds) {
      this._assertAlive();

      if (
        !this.audioElement ||
        !Number.isFinite(seconds) ||
        !Number.isFinite(this.audioElement.duration)
      ) {
        return false;
      }

      const target = this._clamp(
        seconds,
        0,
        this.audioElement.duration
      );

      this.audioElement.currentTime = target;

      this._emit("music:seeked", {
        currentTime: target
      });

      return true;
    }

    seekToProgress(progress) {
      if (!this.audioElement || !Number.isFinite(this.audioElement.duration)) {
        return false;
      }

      const normalized = this._clamp(progress, 0, 1);

      return this.seek(normalized * this.audioElement.duration);
    }

    setVolume(volume) {
      this.volume = this._clamp(volume, 0, 1);

      if (this.audioElement) {
        this.audioElement.volume = this.volume;
      }

      this._emit("music:volume-changed", {
        volume: this.volume
      });

      return this.volume;
    }

    getVolume() {
      return this.volume;
    }

    setShuffle(enabled) {
      this.shuffle = Boolean(enabled);

      this._emit("music:shuffle-changed", {
        enabled: this.shuffle
      });

      return this.shuffle;
    }

    setRepeatMode(mode) {
      const allowed = ["none", "all", "one"];

      if (!allowed.includes(mode)) {
        throw new TypeError("Invalid repeat mode.");
      }

      this.repeatMode = mode;

      if (this.audioElement) {
        this.audioElement.loop = mode === "one";
      }

      this._emit("music:repeat-changed", { mode });

      return this.repeatMode;
    }

    getRepeatMode() {
      return this.repeatMode;
    }

    getCurrentTrack() {
      return this.currentTrack
        ? this._copyTrack(this.currentTrack)
        : null;
    }

    getCurrentIndex() {
      return this.currentIndex;
    }

    getPlaylist() {
      return this.tracks.map((track) => this._copyTrack(track));
    }

    getCurrentTime() {
      return this.audioElement
        ? this.audioElement.currentTime || 0
        : 0;
    }

    getDuration() {
      if (!this.audioElement || !Number.isFinite(this.audioElement.duration)) {
        return 0;
      }

      return this.audioElement.duration;
    }

    getProgress() {
      const duration = this.getDuration();

      return duration > 0
        ? this.getCurrentTime() / duration
        : 0;
    }

    getState() {
      return {
        playing: this.playing,
        paused: this.paused,
        shuffle: this.shuffle,
        repeatMode: this.repeatMode,
        volume: this.volume,
        currentIndex: this.currentIndex,
        currentTrack: this.getCurrentTrack(),
        currentTime: this.getCurrentTime(),
        duration: this.getDuration(),
        progress: this.getProgress(),
        playlistLength: this.tracks.length
      };
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

    _normalizeTrack(track, index) {
      if (!track || typeof track !== "object") {
        return null;
      }

      const src = typeof track.src === "string"
        ? track.src.trim()
        : typeof track.url === "string"
          ? track.url.trim()
          : "";

      if (!src) {
        return null;
      }

      return {
        id: String(track.id ?? "track-" + index),
        title: String(track.title || "Unknown track"),
        artist: String(track.artist || "Unknown artist"),
        album: String(track.album || ""),
        src,
        cover: typeof track.cover === "string" ? track.cover : "",
        duration: Number.isFinite(track.duration) ? track.duration : 0
      };
    }

    _copyTrack(track) {
      return track ? { ...track } : null;
    }

    _randomIndex(excludeIndex) {
      if (this.tracks.length <= 1) {
        return 0;
      }

      let index;

      do {
        index = Math.floor(Math.random() * this.tracks.length);
      } while (index === excludeIndex);

      return index;
    }

    _handleEnded() {
      this.playing = false;

      this._emit("music:track-ended", {
        track: this.getCurrentTrack()
      });

      if (this.repeatMode === "one") {
        this.play(this.currentIndex);
        return;
      }

      if (
        this.repeatMode === "none" &&
        !this.shuffle &&
        this.currentIndex === this.tracks.length - 1
      ) {
        this._emit("music:playlist-ended", {});
        return;
      }

      this.next();
    }

    _handleError() {
      this.playing = false;
      this.paused = false;

      this._emit("music:track-error", {
        track: this.getCurrentTrack(),
        code: this.audioElement
          ? this.audioElement.error?.code || null
          : null
      });
    }

    _handleTimeUpdate() {
      this._emit("music:time-update", {
        currentTime: this.getCurrentTime(),
        duration: this.getDuration(),
        progress: this.getProgress()
      });
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
        throw new Error("MusicPlayer has been destroyed.");
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
          if (global.console && typeof global.console.error === "function") {
            global.console.error("MusicPlayer listener failed.", error);
          }
        }
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.stop();

      if (this.audioElement) {
        this.audioElement.removeEventListener("ended", this._onEnded);
        this.audioElement.removeEventListener("error", this._onError);
        this.audioElement.removeEventListener(
          "timeupdate",
          this._onTimeUpdate
        );

        this.audioElement = null;
      }

      this.tracks = [];
      this.currentTrack = null;
      this.currentIndex = -1;
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeMusicPlayer = MusicPlayer;
})(window);