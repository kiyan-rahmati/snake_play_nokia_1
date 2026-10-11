(function (global) {
  "use strict";

  class CassetteController {
    constructor(options) {
      const settings = options || {};

      this.musicPlayer = settings.musicPlayer || null;
      this.root = settings.root || null;

      this.selectors = {
        play: "[data-cassette-play]",
        pause: "[data-cassette-pause]",
        stop: "[data-cassette-stop]",
        next: "[data-cassette-next]",
        previous: "[data-cassette-previous]",
        progress: "[data-cassette-progress]",
        currentTime: "[data-cassette-current-time]",
        duration: "[data-cassette-duration]",
        title: "[data-cassette-title]",
        artist: "[data-cassette-artist]",
        cover: "[data-cassette-cover]",
        volume: "[data-cassette-volume]",
        mute: "[data-cassette-mute]",
        shuffle: "[data-cassette-shuffle]",
        repeat: "[data-cassette-repeat]",
        status: "[data-cassette-status]",
        cassette: "[data-cassette-body]",
        ...(settings.selectors || {})
      };

      this.unsubscribe = null;
      this.bound = false;
      this.destroyed = false;
      this.draggingProgress = false;
      this.muted = false;
      this.previousVolume = 0.7;
      this._onClick = this._handleClick.bind(this);
      this._onInput = this._handleInput.bind(this);
      this._onChange = this._handleChange.bind(this);
      this._onPointerDown = this._handlePointerDown.bind(this);
      this._onPointerUp = this._handlePointerUp.bind(this);
      this._onKeyDown = this._handleKeyDown.bind(this);
    }

    initialize() {
      if (this.destroyed) {
        throw new Error("CassetteController has been destroyed.");
      }

      if (this.bound) {
        return this;
      }

      this.root = this.root || document;

      this.root.addEventListener("click", this._onClick);
      this.root.addEventListener("input", this._onInput);
      this.root.addEventListener("change", this._onChange);
      this.root.addEventListener("pointerdown", this._onPointerDown);
      this.root.addEventListener("pointerup", this._onPointerUp);
      this.root.addEventListener("keydown", this._onKeyDown);

      if (this.musicPlayer && typeof this.musicPlayer.subscribe === "function") {
        this.unsubscribe = this.musicPlayer.subscribe(() => {
          this.render();
        });
      }

      this.bound = true;
      this.render();

      return this;
    }

    _handleClick(event) {
      const target = event.target.closest(
        [
          this.selectors.play,
          this.selectors.pause,
          this.selectors.stop,
          this.selectors.next,
          this.selectors.previous,
          this.selectors.mute,
          this.selectors.shuffle,
          this.selectors.repeat
        ].join(",")
      );

      if (!target || !this.root.contains(target)) {
        return;
      }

      if (target.matches(this.selectors.play)) {
        this._run(() => {
          const state = this._getState();

          if (state.paused) {
            return this.musicPlayer.resume();
          }

          return this.musicPlayer.play();
        });
      } else if (target.matches(this.selectors.pause)) {
        this._run(() => this.musicPlayer.pause());
      } else if (target.matches(this.selectors.stop)) {
        this._run(() => this.musicPlayer.stop());
      } else if (target.matches(this.selectors.next)) {
        this._run(() => this.musicPlayer.next());
      } else if (target.matches(this.selectors.previous)) {
        this._run(() => this.musicPlayer.previous());
      } else if (target.matches(this.selectors.mute)) {
        this.toggleMute();
      } else if (target.matches(this.selectors.shuffle)) {
        this.toggleShuffle();
      } else if (target.matches(this.selectors.repeat)) {
        this.cycleRepeatMode();
      }
    }

    _handleInput(event) {
      const target = event.target;

      if (target.matches(this.selectors.progress)) {
        this.draggingProgress = true;

        const value = Number(target.value);
        const max = Number(target.max || 100);
        const normalized = max > 0 ? value / max : 0;

        this._setText(
          this.selectors.currentTime,
          this._formatTime(this._getState().duration * normalized)
        );
      }

      if (target.matches(this.selectors.volume)) {
        const max = Number(target.max || 100);
        const value = Number(target.value);
        const normalized = max > 0 ? value / max : 0;

        this.previousVolume = normalized;

        if (this.musicPlayer && typeof this.musicPlayer.setVolume === "function") {
          this.musicPlayer.setVolume(normalized);
        }

        if (normalized > 0 && this.muted) {
          this.muted = false;
        }

        this._updateMuteState();
      }
    }

    _handleChange(event) {
      const target = event.target;

      if (target.matches(this.selectors.progress)) {
        this.draggingProgress = false;

        const value = Number(target.value);
        const max = Number(target.max || 100);
        const normalized = max > 0 ? value / max : 0;

        if (this.musicPlayer && typeof this.musicPlayer.seekToProgress === "function") {
          this.musicPlayer.seekToProgress(normalized);
        }

        this.render();
      }

      if (target.matches(this.selectors.volume)) {
        const max = Number(target.max || 100);
        const value = Number(target.value);
        const normalized = max > 0 ? value / max : 0;

        if (this.musicPlayer && typeof this.musicPlayer.setVolume === "function") {
          this.musicPlayer.setVolume(normalized);
        }

        this.render();
      }
    }

    _handlePointerDown(event) {
      if (event.target.matches(this.selectors.progress)) {
        this.draggingProgress = true;
      }
    }

    _handlePointerUp(event) {
      if (
        this.draggingProgress &&
        event.target.matches(this.selectors.progress)
      ) {
        this.draggingProgress = false;

        const target = event.target;
        const value = Number(target.value);
        const max = Number(target.max || 100);
        const normalized = max > 0 ? value / max : 0;

        if (this.musicPlayer && typeof this.musicPlayer.seekToProgress === "function") {
          this.musicPlayer.seekToProgress(normalized);
        }

        this.render();
      }
    }

    _handleKeyDown(event) {
      if (event.key === "Escape") {
        this._setStatus("");
      }
    }

    async _run(operation) {
      if (!this.musicPlayer || typeof operation !== "function") {
        this._setStatus("Music player is unavailable.");
        return;
      }

      try {
        const result = operation();

        if (result && typeof result.then === "function") {
          await result;
        }

        this.render();
      } catch (error) {
        this._setStatus(
          error && error.message
            ? error.message
            : "Unable to control music playback."
        );
      }
    }

    toggleMute() {
      if (!this.musicPlayer) {
        return false;
      }

      const volume = this._getState().volume;

      if (!this.muted && volume > 0) {
        this.previousVolume = volume;
        this.muted = true;
        this.musicPlayer.setVolume(0);
      } else {
        this.muted = false;
        this.musicPlayer.setVolume(this.previousVolume || 0.7);
      }

      this._updateMuteState();
      this.render();

      return this.muted;
    }

    toggleShuffle() {
      if (!this.musicPlayer || typeof this.musicPlayer.setShuffle !== "function") {
        return false;
      }

      const enabled = !this._getState().shuffle;
      this.musicPlayer.setShuffle(enabled);
      this.render();

      return enabled;
    }

    cycleRepeatMode() {
      if (!this.musicPlayer || typeof this.musicPlayer.setRepeatMode !== "function") {
        return false;
      }

      const modes = ["none", "all", "one"];
      const current = this._getState().repeatMode;
      const index = modes.indexOf(current);
      const next = modes[(index + 1 + modes.length) % modes.length];

      this.musicPlayer.setRepeatMode(next);
      this.render();

      return next;
    }

    render() {
      if (!this.root || !this.musicPlayer) {
        return;
      }

      const state = this._getState();
      const track = state.currentTrack;

      this._setText(
        this.selectors.title,
        track ? track.title : "No track selected"
      );

      this._setText(
        this.selectors.artist,
        track ? track.artist : "Choose a track to begin"
      );

      this._setText(
        this.selectors.currentTime,
        this._formatTime(state.currentTime)
      );

      this._setText(
        this.selectors.duration,
        this._formatTime(state.duration)
      );

      this._renderProgress(state);
      this._renderCover(track);
      this._renderButtons(state);
      this._updateMuteState();

      const cassetteElements = this.root.querySelectorAll(this.selectors.cassette);

      for (const element of cassetteElements) {
        element.classList.toggle("is-playing", state.playing);
        element.classList.toggle("is-paused", state.paused);
      }

      this._setStatus(
        state.playing
          ? "Playing"
          : state.paused
            ? "Paused"
            : track
              ? "Ready"
              : "Idle"
      );
    }

    _renderProgress(state) {
      const elements = this.root.querySelectorAll(this.selectors.progress);

      for (const element of elements) {
        const max = Number(element.max || 100);

        if (!this.draggingProgress) {
          element.value = state.progress * max;
        }

        element.disabled = state.duration <= 0;
        element.setAttribute("aria-valuetext", this._formatTime(state.currentTime));
      }
    }

    _renderCover(track) {
      const elements = this.root.querySelectorAll(this.selectors.cover);

      for (const element of elements) {
        if (element.tagName === "IMG") {
          if (track && track.cover) {
            element.src = track.cover;
            element.alt = track.title + " cover";
            element.hidden = false;
          } else {
            element.removeAttribute("src");
            element.alt = "";
          }
        } else if (element instanceof HTMLElement) {
          if (track && track.cover) {
            element.style.backgroundImage = "url(" + JSON.stringify(track.cover) + ")";
          } else {
            element.style.backgroundImage = "";
          }
        }
      }
    }

    _renderButtons(state) {
      this._setPressed(this.selectors.play, state.playing);
      this._setPressed(this.selectors.pause, state.paused);
      this._setPressed(this.selectors.shuffle, state.shuffle);

      const repeatElements = this.root.querySelectorAll(this.selectors.repeat);

      for (const element of repeatElements) {
        element.dataset.repeatMode = state.repeatMode;
        element.setAttribute("aria-pressed", String(state.repeatMode !== "none"));
        element.setAttribute("aria-label", "Repeat: " + state.repeatMode);
      }

      const volumeElements = this.root.querySelectorAll(this.selectors.volume);

      for (const element of volumeElements) {
        const max = Number(element.max || 100);

        if (document.activeElement !== element) {
          element.value = state.volume * max;
        }
      }
    }

    _setPressed(selector, pressed) {
      const elements = this.root.querySelectorAll(selector);

      for (const element of elements) {
        element.setAttribute("aria-pressed", String(Boolean(pressed)));
      }
    }

    _updateMuteState() {
      if (!this.root) {
        return;
      }

      const buttons = this.root.querySelectorAll(this.selectors.mute);

      for (const button of buttons) {
        button.setAttribute("aria-pressed", String(this.muted));
        button.setAttribute(
          "aria-label",
          this.muted ? "Unmute music" : "Mute music"
        );
      }
    }

    _setText(selector, value) {
      const elements = this.root.querySelectorAll(selector);

      for (const element of elements) {
        element.textContent = value;
      }
    }

    _setStatus(message) {
      if (!this.root) {
        return;
      }

      const elements = this.root.querySelectorAll(this.selectors.status);

      for (const element of elements) {
        element.textContent = message;
      }
    }

    _getState() {
      if (this.musicPlayer && typeof this.musicPlayer.getState === "function") {
        return this.musicPlayer.getState();
      }

      return {
        playing: false,
        paused: false,
        shuffle: false,
        repeatMode: "all",
        volume: 0.7,
        currentIndex: -1,
        currentTrack: null,
        currentTime: 0,
        duration: 0,
        progress: 0,
        playlistLength: 0
      };
    }

    _formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) {
        return "0:00";
      }

      const total = Math.floor(seconds);
      const minutes = Math.floor(total / 60);
      const remainingSeconds = total % 60;

      return minutes + ":" + String(remainingSeconds).padStart(2, "0");
    }

    _clamp(value, min, max) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return min;
      }

      return Math.min(max, Math.max(min, number));
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }

      if (this.root && this.bound) {
        this.root.removeEventListener("click", this._onClick);
        this.root.removeEventListener("input", this._onInput);
        this.root.removeEventListener("change", this._onChange);
        this.root.removeEventListener("pointerdown", this._onPointerDown);
        this.root.removeEventListener("pointerup", this._onPointerUp);
        this.root.removeEventListener("keydown", this._onKeyDown);
      }

      this.root = null;
      this.bound = false;
      this.destroyed = true;
    }
  }

  global.SnakeCassetteController = CassetteController;
})(window);