(function (global) {
  "use strict";

  const SnakeLevelIntro = {
    root: null,
    timeoutId: null,
    animationFrameId: null,
    visible: false,
    paused: false,
    startedAt: 0,
    duration: 2500,
    remaining: 2500,
    currentLevel: null,
    onComplete: null,
    resolveIntro: null,
    generation: 0,

    init(root) {
      if (this.root) return this;

      this.root = root || document.querySelector("[data-level-intro]");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.levelIntro = "";
        this.root.className = "level-intro-overlay";
        this.root.hidden = true;
        this.root.setAttribute("aria-hidden", "true");

        const host =
          document.querySelector("[data-game-overlay]") ||
          document.querySelector(".game-board-frame") ||
          document.body;

        host.appendChild(this.root);
      }

      this.root.setAttribute("role", "dialog");
      this.root.setAttribute("aria-modal", "true");
      this.root.setAttribute("aria-labelledby", "level-intro-title");
      this.root.setAttribute("aria-describedby", "level-intro-description");

      return this;
    },

    show(level, options) {
      options = options || {};

      this.cancel();

      this.init(options.root);

      const generation = ++this.generation;
      const normalized = this.normalizeLevel(level);

      this.currentLevel = normalized;
      this.duration = this.normalizeDuration(options.duration);
      this.remaining = this.duration;
      this.startedAt = this.getNow();
      this.visible = true;
      this.paused = false;
      this.onComplete = typeof options.onComplete === "function"
        ? options.onComplete
        : null;

      this.render(normalized, options);
      this.setVisible(true);

      const promise = new Promise((resolve) => {
        this.resolveIntro = resolve;
      });

      if (options.waitForContinue === true) {
        this.renderContinueButton(generation);
      } else {
        this.scheduleFrame(generation);
      }

      return promise;
    },

    normalizeLevel(level) {
      if (typeof level === "number") {
        return {
          number: Math.max(1, Math.floor(level)),
          name: "Level " + Math.max(1, Math.floor(level)),
          description: "",
          world: "",
          objective: ""
        };
      }

      level = level && typeof level === "object" ? level : {};

      const number = Number(level.number ?? level.level ?? 1);

      return {
        number: Number.isFinite(number) ? Math.max(1, Math.floor(number)) : 1,
        name: this.safeText(level.name || level.title || "New Level"),
        description: this.safeText(level.description || ""),
        world: this.safeText(level.worldName || level.world || ""),
        objective: this.safeText(level.objective || "")
      };
    },

    normalizeDuration(value) {
      if (value === undefined || value === null) return 2500;

      const duration = Number(value);

      if (!Number.isFinite(duration)) return 2500;

      return Math.max(0, Math.min(30000, duration));
    },

    render(level, options) {
      const accent = this.safeColor(options.accentColor);
      const worldLabel = level.world
        ? `<p class="level-intro-world">${this.escapeHtml(level.world)}</p>`
        : "";

      const description = level.description
        ? `<p class="level-intro-description" id="level-intro-description">${this.escapeHtml(level.description)}</p>`
        : `<p class="level-intro-description" id="level-intro-description">Get ready for the next challenge.</p>`;

      const objective = level.objective
        ? `<div class="level-intro-objective"><span class="level-intro-objective-label">OBJECTIVE</span><p>${this.escapeHtml(level.objective)}</p></div>`
        : "";

      this.root.innerHTML = `
        <div class="level-intro-backdrop"></div>
        <div class="level-intro-panel" style="--level-intro-accent: ${accent}">
          <div class="level-intro-decoration" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          ${worldLabel}
          <p class="level-intro-eyebrow">LEVEL ${level.number}</p>
          <h2 class="level-intro-title" id="level-intro-title">${this.escapeHtml(level.name)}</h2>
          ${description}
          ${objective}
          <div class="level-intro-progress" aria-hidden="true">
            <span data-level-intro-progress></span>
          </div>
          <div class="level-intro-actions" data-level-intro-actions></div>
        </div>
      `;

      this.progressElement = this.root.querySelector(
        "[data-level-intro-progress]"
      );

      this.actionsElement = this.root.querySelector(
        "[data-level-intro-actions]"
      );
    },

    renderContinueButton(generation) {
      if (!this.actionsElement) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "level-intro-continue";
      button.textContent = "Continue";
      button.addEventListener("click", () => {
        if (generation !== this.generation) return;
        this.finish();
      });

      this.actionsElement.replaceChildren(button);
      button.focus();
    },

    scheduleFrame(generation) {
      if (
        !this.visible ||
        this.paused ||
        this.animationFrameId !== null ||
        generation !== this.generation
      ) {
        return;
      }

      if (typeof global.requestAnimationFrame === "function") {
        this.animationFrameId = global.requestAnimationFrame(() => {
          this.animationFrameId = null;
          this.update(generation);
        });
      } else {
        this.timeoutId = global.setTimeout(() => {
          this.timeoutId = null;
          this.update(generation);
        }, 50);
      }
    },

    update(generation) {
      if (
        !this.visible ||
        this.paused ||
        generation !== this.generation
      ) {
        return;
      }

      const elapsed = Math.max(0, this.getNow() - this.startedAt);
      this.remaining = Math.max(0, this.duration - elapsed);

      if (this.progressElement) {
        const progress = this.duration > 0
          ? Math.min(1, elapsed / this.duration)
          : 1;

        this.progressElement.style.transform = "scaleX(" + progress + ")";
      }

      if (this.remaining <= 0) {
        this.finish();
        return;
      }

      this.scheduleFrame(generation);
    },

    pause() {
      if (!this.visible || this.paused) return;

      this.remaining = Math.max(
        0,
        this.duration - (this.getNow() - this.startedAt)
      );

      this.paused = true;
      this.clearScheduledWork();
    },

    resume() {
      if (!this.visible || !this.paused) return;

      this.paused = false;
      this.startedAt = this.getNow() - (this.duration - this.remaining);
      this.scheduleFrame(this.generation);
    },

    finish() {
      if (!this.visible) return;

      this.clearScheduledWork();

      this.visible = false;
      this.paused = false;
      this.remaining = 0;

      const callback = this.onComplete;
      const resolve = this.resolveIntro;

      this.onComplete = null;
      this.resolveIntro = null;

      this.setVisible(false);

      if (typeof callback === "function") {
        try {
          callback(this.currentLevel);
        } catch (error) {
          this.reportError(error);
        }
      }

      if (typeof resolve === "function") {
        resolve({
          completed: true,
          cancelled: false,
          level: this.currentLevel
        });
      }
    },

    cancel() {
      const wasVisible = this.visible;
      const resolve = this.resolveIntro;

      this.generation++;
      this.clearScheduledWork();

      this.visible = false;
      this.paused = false;
      this.remaining = 0;
      this.onComplete = null;
      this.resolveIntro = null;

      if (this.root) {
        this.setVisible(false);
      }

      if (wasVisible && typeof resolve === "function") {
        resolve({
          completed: false,
          cancelled: true,
          level: this.currentLevel
        });
      }
    },

    setVisible(visible) {
      if (!this.root) return;

      this.root.hidden = !visible;
      this.root.setAttribute("aria-hidden", visible ? "false" : "true");
      this.root.classList.toggle("is-visible", visible);
      this.root.classList.toggle("is-hidden", !visible);
    },

    clearScheduledWork() {
      if (this.animationFrameId !== null) {
        if (typeof global.cancelAnimationFrame === "function") {
          global.cancelAnimationFrame(this.animationFrameId);
        }

        this.animationFrameId = null;
      }

      if (this.timeoutId !== null) {
        global.clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    },

    safeText(value) {
      return String(value ?? "").slice(0, 500);
    },

    escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        };

        return entities[character];
      });
    },

    safeColor(value) {
      if (
        typeof value === "string" &&
        /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|[a-z]+)$/i.test(value)
      ) {
        return value;
      }

      return "#f5c451";
    },

    getNow() {
      if (global.performance && typeof global.performance.now === "function") {
        return global.performance.now();
      }

      return Date.now();
    },

    isVisible() {
      return this.visible;
    },

    getCurrentLevel() {
      return this.currentLevel;
    },

    reportError(error) {
      if (
        global.SnakeLogger &&
        typeof global.SnakeLogger.error === "function"
      ) {
        global.SnakeLogger.error("Level intro callback failed.", error);
      }
    },

    destroy() {
      this.cancel();

      if (this.root && this.root.dataset.levelIntro !== undefined) {
        this.root.remove();
      }

      this.root = null;
      this.progressElement = null;
      this.actionsElement = null;
      this.currentLevel = null;
    }
  };

  global.SnakeLevelIntro = SnakeLevelIntro;
})(window);