(function (global) {
  "use strict";

  const SnakeCountdownOverlay = {
    root: null,
    timerId: null,
    animationFrameId: null,
    startedAt: 0,
    duration: 3000,
    currentValue: null,
    resolveCountdown: null,
    running: false,
    paused: false,
    remaining: 3000,
    lastAnnouncement: null,
    onComplete: null,
    onTick: null,
    boundVisibilityChange: null,

    init(root) {
      if (this.root) return this;

      this.root = root || document.querySelector("[data-countdown-overlay]");

      if (!this.root) {
        this.root = document.createElement("div");
        this.root.dataset.countdownOverlay = "";
        this.root.className = "countdown-overlay";
        this.root.hidden = true;
        this.root.setAttribute("aria-hidden", "true");

        const host = document.querySelector("[data-game-overlay]") ||
          document.querySelector(".game-board-frame") ||
          document.body;

        host.appendChild(this.root);
      }

      this.root.setAttribute("role", "status");
      this.root.setAttribute("aria-live", "assertive");
      this.root.setAttribute("aria-atomic", "true");

      this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
      document.addEventListener(
        "visibilitychange",
        this.boundVisibilityChange
      );

      return this;
    },

    start(options) {
      options = options || {};

      this.cancel(false);
      this.init(options.root);

      this.duration = this.normalizeDuration(options.duration);
      this.remaining = this.duration;
      this.startedAt = 0;
      this.currentValue = null;
      this.lastAnnouncement = null;
      this.running = true;
      this.paused = false;
      this.onComplete = typeof options.onComplete === "function"
        ? options.onComplete
        : null;
      this.onTick = typeof options.onTick === "function"
        ? options.onTick
        : null;

      this.render();
      this.show();

      if (options.startImmediately === true) {
        this.begin();
      } else {
        this.scheduleFrame();
      }

      return new Promise((resolve) => {
        this.resolveCountdown = resolve;
      });
    },

    normalizeDuration(value) {
      const duration = Number(value);

      if (!Number.isFinite(duration)) return 3000;

      return Math.min(60000, Math.max(0, duration));
    },

    begin() {
      if (!this.running || this.paused) return;

      this.startedAt = this.getNow();
      this.remaining = this.duration;

      if (this.duration <= 0) {
        this.finish();
        return;
      }

      this.scheduleFrame();
    },

    render() {
      if (!this.root) return;

      this.root.innerHTML = `
        <div class="countdown-overlay-backdrop" aria-hidden="true"></div>
        <div class="countdown-overlay-content">
          <p class="countdown-overlay-label">GET READY</p>
          <div class="countdown-overlay-number" data-countdown-number>3</div>
          <p class="countdown-overlay-message" data-countdown-message>
            Prepare to play
          </p>
        </div>
      `;

      this.numberElement = this.root.querySelector("[data-countdown-number]");
      this.messageElement = this.root.querySelector("[data-countdown-message]");
    },

    show() {
      if (!this.root) return;

      this.root.hidden = false;
      this.root.setAttribute("aria-hidden", "false");
      this.root.classList.remove("is-hidden");
      this.root.classList.add("is-visible");
    },

    hide() {
      if (!this.root) return;

      this.root.classList.remove("is-visible");
      this.root.classList.add("is-hidden");
      this.root.hidden = true;
      this.root.setAttribute("aria-hidden", "true");
    },

    scheduleFrame() {
      if (!this.running || this.paused || this.animationFrameId !== null) {
        return;
      }

      if (typeof global.requestAnimationFrame === "function") {
        this.animationFrameId = global.requestAnimationFrame(() => {
          this.animationFrameId = null;
          this.update();
        });
      } else {
        this.timerId = global.setTimeout(() => {
          this.timerId = null;
          this.update();
        }, 50);
      }
    },

    update() {
      if (!this.running || this.paused) return;

      if (this.startedAt === 0) {
        this.begin();
        return;
      }

      const elapsed = Math.max(0, this.getNow() - this.startedAt);
      this.remaining = Math.max(0, this.duration - elapsed);

      const secondsRemaining = Math.ceil(this.remaining / 1000);
      const value = secondsRemaining > 0 ? secondsRemaining : "GO!";

      if (value !== this.currentValue) {
        this.currentValue = value;
        this.updateDisplay(value);
      }

      if (typeof this.onTick === "function") {
        this.onTick({
          remaining: this.remaining,
          elapsed,
          value
        });
      }

      if (this.remaining <= 0) {
        this.finish();
        return;
      }

      this.scheduleFrame();
    },

    updateDisplay(value) {
      if (this.numberElement) {
        this.numberElement.textContent = String(value);
        this.numberElement.classList.remove("countdown-pop");
        void this.numberElement.offsetWidth;
        this.numberElement.classList.add("countdown-pop");
      }

      if (this.messageElement) {
        this.messageElement.textContent =
          value === "GO!" ? "Go, go, go!" : "Prepare to play";
      }

      const announcement = String(value);

      if (announcement !== this.lastAnnouncement) {
        this.lastAnnouncement = announcement;

        if (this.root) {
          this.root.setAttribute("aria-label", "Game starts in " + announcement);
        }
      }
    },

    pause() {
      if (!this.running || this.paused) return;

      if (this.startedAt !== 0) {
        const elapsed = Math.max(0, this.getNow() - this.startedAt);
        this.remaining = Math.max(0, this.duration - elapsed);
      }

      this.paused = true;
      this.clearScheduledWork();

      if (this.root) {
        this.root.classList.add("is-paused");
      }
    },

    resume() {
      if (!this.running || !this.paused) return;

      this.paused = false;

      if (this.root) {
        this.root.classList.remove("is-paused");
      }

      this.startedAt = this.getNow() - (this.duration - this.remaining);
      this.scheduleFrame();
    },

    finish() {
      if (!this.running) return;

      this.running = false;
      this.paused = false;
      this.remaining = 0;
      this.clearScheduledWork();

      if (this.numberElement) {
        this.numberElement.textContent = "GO!";
      }

      if (this.messageElement) {
        this.messageElement.textContent = "Go, go, go!";
      }

      const callback = this.onComplete;
      const resolver = this.resolveCountdown;

      this.onComplete = null;
      this.onTick = null;
      this.resolveCountdown = null;

      if (typeof callback === "function") {
        try {
          callback();
        } catch (error) {
          this.reportError(error);
        }
      }

      this.hide();

      if (typeof resolver === "function") {
        resolver({
          completed: true,
          cancelled: false
        });
      }
    },

    cancel(hideOverlay) {
      const wasRunning = this.running;
      const resolver = this.resolveCountdown;

      this.running = false;
      this.paused = false;
      this.remaining = 0;
      this.onComplete = null;
      this.onTick = null;
      this.resolveCountdown = null;

      this.clearScheduledWork();

      if (hideOverlay !== false) {
        this.hide();
      }

      if (wasRunning && typeof resolver === "function") {
        resolver({
          completed: false,
          cancelled: true
        });
      }
    },

    clearScheduledWork() {
      if (this.animationFrameId !== null) {
        if (typeof global.cancelAnimationFrame === "function") {
          global.cancelAnimationFrame(this.animationFrameId);
        }

        this.animationFrameId = null;
      }

      if (this.timerId !== null) {
        global.clearTimeout(this.timerId);
        this.timerId = null;
      }
    },

    handleVisibilityChange() {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    },

    getNow() {
      if (global.performance && typeof global.performance.now === "function") {
        return global.performance.now();
      }

      return Date.now();
    },

    reportError(error) {
      const logger = global.SnakeLogger;

      if (logger && typeof logger.error === "function") {
        logger.error("Countdown overlay callback failed.", error);
      }
    },

    isRunning() {
      return this.running;
    },

    isPaused() {
      return this.paused;
    },

    getRemainingTime() {
      if (!this.running) return 0;

      if (this.paused || this.startedAt === 0) {
        return this.remaining;
      }

      return Math.max(
        0,
        this.duration - (this.getNow() - this.startedAt)
      );
    },

    destroy() {
      this.cancel(true);

      if (this.boundVisibilityChange) {
        document.removeEventListener(
          "visibilitychange",
          this.boundVisibilityChange
        );
      }

      this.boundVisibilityChange = null;

      if (this.root && this.root.dataset.countdownOverlay !== undefined) {
        this.root.remove();
      }

      this.root = null;
      this.numberElement = null;
      this.messageElement = null;
    }
  };

  global.SnakeCountdownOverlay = SnakeCountdownOverlay;
})(window);