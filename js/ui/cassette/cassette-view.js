(function (global) {
  "use strict";

  const SnakeCassetteView = {
    root: null,
    elements: {},
    state: {
      track: null,
      title: "No Tape Inserted",
      artist: "Snake Cassette Player",
      playing: false,
      paused: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      muted: false,
      playlist: [],
      trackIndex: -1,
      repeat: "off",
      shuffle: false,
      loading: false,
      error: null
    },

    init(root) {
      if (this.root) return this;

      this.root =
        root ||
        document.querySelector("[data-cassette-player]") ||
        document.querySelector(".cassette-player");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.cassettePlayer = "";
        this.root.className = "cassette-player";

        const host =
          document.querySelector("[data-cassette-container]") ||
          document.querySelector("[data-audio-panel]") ||
          document.body;

        host.appendChild(this.root);
      }

      this.root.setAttribute("aria-label", "Cassette music player");

      this.render();
      this.cacheElements();
      this.bindEvents();
      this.update();

      return this;
    },

    render() {
      this.root.innerHTML = `
        <div class="cassette-player-shell">
          <header class="cassette-player-header">
            <div class="cassette-player-brand">
              <span class="cassette-player-brand-mark" aria-hidden="true">▶</span>
              <div>
                <p class="cassette-player-brand-name">SNAKE AUDIO</p>
                <p class="cassette-player-brand-caption">RETRO CASSETTE PLAYER</p>
              </div>
            </div>

            <span
              class="cassette-player-status"
              data-cassette-status
              role="status"
              aria-live="polite"
            >READY</span>
          </header>

          <div class="cassette-player-display">
            <div class="cassette-player-track-info">
              <p class="cassette-player-label">NOW PLAYING</p>
              <h2 class="cassette-player-track-title" data-cassette-title>
                No Tape Inserted
              </h2>
              <p class="cassette-player-track-artist" data-cassette-artist>
                Snake Cassette Player
              </p>
            </div>

            <div
              class="cassette-player-equalizer"
              data-cassette-equalizer
              aria-hidden="true"
            >
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div class="cassette-tape" data-cassette-tape>
            <div class="cassette-tape-top">
              <span class="cassette-tape-screw"></span>
              <span class="cassette-tape-label" data-cassette-label>
                SIDE A
              </span>
              <span class="cassette-tape-screw"></span>
            </div>

            <div class="cassette-tape-window">
              <div class="cassette-tape-reel cassette-tape-reel-left">
                <div class="cassette-tape-reel-center">
                  <span></span>
                </div>
              </div>

              <div class="cassette-tape-window-center">
                <span class="cassette-tape-window-line"></span>
                <span class="cassette-tape-window-line"></span>
                <span class="cassette-tape-window-line"></span>
              </div>

              <div class="cassette-tape-reel cassette-tape-reel-right">
                <div class="cassette-tape-reel-center">
                  <span></span>
                </div>
              </div>
            </div>

            <div class="cassette-tape-bottom">
              <span class="cassette-tape-hole"></span>
              <span class="cassette-tape-bottom-label">SNAKE RECORDS</span>
              <span class="cassette-tape-hole"></span>
            </div>
          </div>

          <div class="cassette-player-timeline">
            <span data-cassette-current-time>00:00</span>

            <input
              type="range"
              min="0"
              max="100"
              value="0"
              step="0.1"
              data-cassette-seek
              aria-label="Seek through track"
            />

            <span data-cassette-duration>00:00</span>
          </div>

          <div class="cassette-player-controls">
            <button
              type="button"
              class="cassette-control-button"
              data-cassette-action="shuffle"
              aria-label="Toggle shuffle"
              aria-pressed="false"
              title="Shuffle"
            >⤨</button>

            <button
              type="button"
              class="cassette-control-button"
              data-cassette-action="previous"
              aria-label="Previous track"
              title="Previous track"
            >|◀</button>

            <button
              type="button"
              class="cassette-control-button cassette-control-play"
              data-cassette-action="play"
              aria-label="Play"
              title="Play"
            >▶</button>

            <button
              type="button"
              class="cassette-control-button"
              data-cassette-action="next"
              aria-label="Next track"
              title="Next track"
            >▶|</button>

            <button
              type="button"
              class="cassette-control-button"
              data-cassette-action="repeat"
              aria-label="Repeat mode"
              aria-pressed="false"
              title="Repeat off"
            >↻</button>
          </div>

          <div class="cassette-player-volume">
            <button
              type="button"
              class="cassette-control-button cassette-volume-button"
              data-cassette-action="mute"
              aria-label="Mute"
              title="Mute"
            >♫</button>

            <input
              type="range"
              min="0"
              max="1"
              value="0.7"
              step="0.01"
              data-cassette-volume
              aria-label="Volume"
            />

            <span class="cassette-volume-value" data-cassette-volume-value>
              70%
            </span>
          </div>

          <div
            class="cassette-player-error"
            data-cassette-error
            role="alert"
            hidden
          ></div>

          <footer class="cassette-player-footer">
            <span data-cassette-track-count>0 TRACKS</span>
            <span class="cassette-player-footer-divider">•</span>
            <span data-cassette-mode>SEQUENTIAL PLAYBACK</span>
          </footer>
        </div>
      `;
    },

    cacheElements() {
      const selectors = {
        status: "[data-cassette-status]",
        title: "[data-cassette-title]",
        artist: "[data-cassette-artist]",
        label: "[data-cassette-label]",
        tape: "[data-cassette-tape]",
        equalizer: "[data-cassette-equalizer]",
        currentTime: "[data-cassette-current-time]",
        duration: "[data-cassette-duration]",
        seek: "[data-cassette-seek]",
        volume: "[data-cassette-volume]",
        volumeValue: "[data-cassette-volume-value]",
        error: "[data-cassette-error]",
        trackCount: "[data-cassette-track-count]",
        mode: "[data-cassette-mode]",
        playButton: '[data-cassette-action="play"]',
        muteButton: '[data-cassette-action="mute"]',
        shuffleButton: '[data-cassette-action="shuffle"]',
        repeatButton: '[data-cassette-action="repeat"]'
      };

      Object.keys(selectors).forEach((key) => {
        this.elements[key] = this.root.querySelector(selectors[key]);
      });
    },

    bindEvents() {
      if (this.bound) return;

      this.bound = true;

      this.root.addEventListener("click", (event) => {
        const button = event.target.closest("[data-cassette-action]");

        if (!button || !this.root.contains(button)) return;

        this.handleAction(button.dataset.cassetteAction);
      });

      this.elements.seek.addEventListener("input", () => {
        const duration = this.state.duration;

        if (!duration) return;

        const time = (Number(this.elements.seek.value) / 100) * duration;

        this.emit("cassette:seek-request", {
          time,
          percentage: Number(this.elements.seek.value)
        });
      });

      this.elements.volume.addEventListener("input", () => {
        this.setVolume(Number(this.elements.volume.value));
      });
    },

    handleAction(action) {
      switch (action) {
        case "play":
          this.emit(
            this.state.playing
              ? "cassette:pause-request"
              : "cassette:play-request",
            this.getPlaybackState()
          );
          break;

        case "previous":
          this.emit("cassette:previous-request", this.getPlaybackState());
          break;

        case "next":
          this.emit("cassette:next-request", this.getPlaybackState());
          break;

        case "mute":
          this.setMuted(!this.state.muted);
          this.emit("cassette:mute-change", {
            muted: this.state.muted,
            volume: this.state.volume
          });
          break;

        case "shuffle":
          this.setShuffle(!this.state.shuffle);
          this.emit("cassette:shuffle-change", {
            shuffle: this.state.shuffle
          });
          break;

        case "repeat":
          this.cycleRepeat();
          this.emit("cassette:repeat-change", {
            repeat: this.state.repeat
          });
          break;

        default:
          break;
      }
    },

    setTrack(track) {
      if (!track || typeof track !== "object") {
        this.state.track = null;
        this.state.title = "No Tape Inserted";
        this.state.artist = "Snake Cassette Player";
        this.state.currentTime = 0;
        this.state.duration = 0;
        this.state.playing = false;
        this.state.paused = false;
        this.update();
        return;
      }

      this.state.track = track;
      this.state.title = this.safeText(track.title || track.name || "Unknown Track");
      this.state.artist = this.safeText(track.artist || track.album || "Unknown Artist");
      this.state.currentTime = 0;

      const duration = Number(track.duration);

      this.state.duration = Number.isFinite(duration) && duration > 0
        ? duration
        : 0;

      this.state.error = null;

      this.update();

      return this;
    },

    setPlaylist(playlist, currentIndex) {
      this.state.playlist = Array.isArray(playlist)
        ? playlist.filter((track) => track && typeof track === "object")
        : [];

      const index = Number(currentIndex);

      this.state.trackIndex = Number.isInteger(index) &&
        index >= 0 &&
        index < this.state.playlist.length
          ? index
          : -1;

      if (this.state.trackIndex >= 0) {
        this.setTrack(this.state.playlist[this.state.trackIndex]);
      }

      this.update();

      return this;
    },

    setPlaybackState(playback) {
      playback = playback && typeof playback === "object" ? playback : {};

      if (typeof playback.playing === "boolean") {
        this.state.playing = playback.playing;
      }

      if (typeof playback.paused === "boolean") {
        this.state.paused = playback.paused;
      }

      if (Number.isFinite(Number(playback.currentTime))) {
        this.state.currentTime = Math.max(0, Number(playback.currentTime));
      }

      if (Number.isFinite(Number(playback.duration))) {
        this.state.duration = Math.max(0, Number(playback.duration));
      }

      if (typeof playback.loading === "boolean") {
        this.state.loading = playback.loading;
      }

      if (playback.error) {
        this.state.error = this.safeText(playback.error);
      } else if (playback.error === null) {
        this.state.error = null;
      }

      this.update();

      return this;
    },

    setVolume(volume) {
      if (!Number.isFinite(volume)) return this;

      this.state.volume = Math.max(0, Math.min(1, volume));

      if (this.state.volume > 0 && this.state.muted) {
        this.state.muted = false;
      }

      this.updateVolume();

      this.emit("cassette:volume-change", {
        volume: this.state.volume,
        muted: this.state.muted
      });

      return this;
    },

    setMuted(muted) {
      this.state.muted = Boolean(muted);
      this.updateVolume();
      return this;
    },

    setShuffle(enabled) {
      this.state.shuffle = Boolean(enabled);
      this.updateControls();
      return this;
    },

    cycleRepeat() {
      const modes = ["off", "all", "one"];
      const index = modes.indexOf(this.state.repeat);

      this.state.repeat = modes[(index + 1) % modes.length];

      this.updateControls();

      return this.state.repeat;
    },

    setRepeat(mode) {
      const allowed = ["off", "all", "one"];

      this.state.repeat = allowed.includes(mode) ? mode : "off";
      this.updateControls();

      return this;
    },

    setStatus(status) {
      const allowed = [
        "READY",
        "PLAYING",
        "PAUSED",
        "LOADING",
        "ERROR",
        "STOPPED"
      ];

      this.state.status = allowed.includes(status) ? status : "READY";
      this.updateStatus();

      return this;
    },

    setError(message) {
      this.state.error = message ? this.safeText(message) : null;
      this.updateError();
      this.updateStatus();

      return this;
    },

    update() {
      if (!this.root) return this;

      this.elements.title.textContent = this.state.title;
      this.elements.artist.textContent = this.state.artist;
      this.elements.currentTime.textContent = this.formatTime(
        this.state.currentTime
      );
      this.elements.duration.textContent = this.formatTime(
        this.state.duration
      );

      const percentage = this.state.duration > 0
        ? (this.state.currentTime / this.state.duration) * 100
        : 0;

      this.elements.seek.value = String(
        Math.max(0, Math.min(100, percentage))
      );

      this.elements.seek.disabled = this.state.duration <= 0;

      this.elements.trackCount.textContent =
        this.state.playlist.length + " TRACK" +
        (this.state.playlist.length === 1 ? "" : "S");

      this.elements.mode.textContent = this.state.shuffle
        ? "SHUFFLE PLAYBACK"
        : "SEQUENTIAL PLAYBACK";

      this.elements.tape.classList.toggle(
        "is-playing",
        this.state.playing && !this.state.paused
      );

      this.elements.equalizer.classList.toggle(
        "is-active",
        this.state.playing && !this.state.paused
      );

      this.updateControls();
      this.updateVolume();
      this.updateStatus();
      this.updateError();

      return this;
    },

    updateControls() {
      const playButton = this.elements.playButton;

      playButton.textContent = this.state.playing && !this.state.paused
        ? "Ⅱ"
        : "▶";

      playButton.setAttribute(
        "aria-label",
        this.state.playing && !this.state.paused ? "Pause" : "Play"
      );

      playButton.title =
        this.state.playing && !this.state.paused ? "Pause" : "Play";

      this.elements.shuffleButton.setAttribute(
        "aria-pressed",
        this.state.shuffle ? "true" : "false"
      );

      this.elements.shuffleButton.classList.toggle(
        "is-active",
        this.state.shuffle
      );

      this.elements.repeatButton.setAttribute(
        "aria-pressed",
        this.state.repeat !== "off" ? "true" : "false"
      );

      this.elements.repeatButton.classList.toggle(
        "is-active",
        this.state.repeat !== "off"
      );

      this.elements.repeatButton.textContent =
        this.state.repeat === "one" ? "↻¹" : "↻";

      this.elements.repeatButton.title =
        "Repeat " + this.state.repeat;
    },

    updateVolume() {
      if (!this.elements.volume) return;

      this.elements.volume.value = String(this.state.volume);

      this.elements.volumeValue.textContent =
        Math.round(this.state.volume * 100) + "%";

      this.elements.muteButton.textContent = this.state.muted
        ? "🔇"
        : this.state.volume <= 0.35
          ? "♫"
          : "♬";

      this.elements.muteButton.setAttribute(
        "aria-label",
        this.state.muted ? "Unmute" : "Mute"
      );

      this.elements.muteButton.title =
        this.state.muted ? "Unmute" : "Mute";
    },

    updateStatus() {
      if (!this.elements.status) return;

      let status = this.state.status || "READY";

      if (this.state.error) {
        status = "ERROR";
      } else if (this.state.loading) {
        status = "LOADING";
      } else if (this.state.playing && !this.state.paused) {
        status = "PLAYING";
      } else if (this.state.paused) {
        status = "PAUSED";
      } else if (!this.state.track) {
        status = "READY";
      }

      this.elements.status.textContent = status;
      this.elements.status.dataset.status = status.toLowerCase();
    },

    updateError() {
      if (!this.elements.error) return;

      this.elements.error.hidden = !this.state.error;
      this.elements.error.textContent = this.state.error || "";
    },

    getPlaybackState() {
      return {
        track: this.state.track,
        trackIndex: this.state.trackIndex,
        playing: this.state.playing,
        paused: this.state.paused,
        currentTime: this.state.currentTime,
        duration: this.state.duration,
        volume: this.state.volume,
        muted: this.state.muted,
        shuffle: this.state.shuffle,
        repeat: this.state.repeat
      };
    },

    formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) {
        return "00:00";
      }

      const total = Math.floor(seconds);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const remainingSeconds = total % 60;

      if (hours > 0) {
        return [
          String(hours).padStart(2, "0"),
          String(minutes).padStart(2, "0"),
          String(remainingSeconds).padStart(2, "0")
        ].join(":");
      }

      return [
        String(minutes).padStart(2, "0"),
        String(remainingSeconds).padStart(2, "0")
      ].join(":");
    },

    safeText(value) {
      return String(value ?? "").slice(0, 500);
    },

    emit(name, detail) {
      const payload = Object.assign(
        {
          player: "cassette",
          state: this.getPlaybackState()
        },
        detail || {}
      );

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit(name, payload);
      }

      if (typeof global.CustomEvent === "function") {
        global.dispatchEvent(
          new CustomEvent(name, {
            detail: payload
          })
        );
      }
    },

    destroy() {
      if (this.root) {
        this.root.replaceChildren();
      }

      this.root = null;
      this.elements = {};
      this.actionButtons = [];
      this.bound = false;

      this.state = {
        track: null,
        title: "No Tape Inserted",
        artist: "Snake Cassette Player",
        playing: false,
        paused: false,
        currentTime: 0,
        duration: 0,
        volume: 0.7,
        muted: false,
        playlist: [],
        trackIndex: -1,
        repeat: "off",
        shuffle: false,
        loading: false,
        error: null
      };
    }
  };

  global.SnakeCassetteView = SnakeCassetteView;
})(window);