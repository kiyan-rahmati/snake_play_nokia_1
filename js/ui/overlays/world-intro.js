(function (global) {
  "use strict";

  const SnakeWorldIntro = {
    root: null,
    visible: false,
    paused: false,
    timeoutId: null,
    animationFrameId: null,
    startedAt: 0,
    duration: 3200,
    remaining: 3200,
    currentWorld: null,
    onComplete: null,
    resolveIntro: null,
    generation: 0,
    progressElement: null,
    actionsElement: null,

    init(root) {
      if (this.root) return this;

      this.root = root || document.querySelector("[data-world-intro]");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.worldIntro = "";
        this.root.className = "world-intro-overlay";
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
      this.root.setAttribute("aria-labelledby", "world-intro-title");
      this.root.setAttribute("aria-describedby", "world-intro-description");

      return this;
    },

    show(world, options) {
      options = options || {};

      this.cancel();
      this.init(options.root);

      const generation = ++this.generation;
      const normalized = this.normalizeWorld(world);

      this.currentWorld = normalized;
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

    normalizeWorld(world) {
      if (typeof world === "number") {
        const number = Math.max(1, Math.floor(world));

        return {
          id: "world-" + number,
          number,
          name: "World " + number,
          subtitle: "",
          description: "",
          theme: "",
          difficulty: "",
          levelCount: null
        };
      }

      world = world && typeof world === "object" ? world : {};

      const rawNumber = Number(world.number ?? world.worldNumber ?? 1);
      const number = Number.isFinite(rawNumber)
        ? Math.max(1, Math.floor(rawNumber))
        : 1;

      const rawLevelCount = Number(world.levelCount);

      return {
        id: this.safeText(world.id || world.worldId || "world-" + number),
        number,
        name: this.safeText(world.name || world.title || "New World"),
        subtitle: this.safeText(world.subtitle || world.tagline || ""),
        description: this.safeText(world.description || ""),
        theme: this.safeText(world.theme || world.themeName || ""),
        difficulty: this.safeText(world.difficulty || ""),
        levelCount: Number.isFinite(rawLevelCount) && rawLevelCount > 0
          ? Math.floor(rawLevelCount)
          : null
      };
    },

    normalizeDuration(value) {
      if (value === undefined || value === null) return 3200;

      const duration = Number(value);

      if (!Number.isFinite(duration)) return 3200;

      return Math.max(0, Math.min(30000, duration));
    },

    render(world, options) {
      const accent = this.safeColor(options.accentColor);
      const background = this.safeColor(options.backgroundColor);
      const themeClass = this.getThemeClass(world.theme);

      const subtitle = world.subtitle
        ? `<p class="world-intro-subtitle">${this.escapeHtml(world.subtitle)}</p>`
        : "";

      const description = world.description
        ? this.escapeHtml(world.description)
        : "A new adventure begins. Explore the world and master every challenge.";

      const difficulty = world.difficulty
        ? `
          <div class="world-intro-stat">
            <span class="world-intro-stat-label">DIFFICULTY</span>
            <span class="world-intro-stat-value">${this.escapeHtml(world.difficulty)}</span>
          </div>
        `
        : "";

      const levels = world.levelCount
        ? `
          <div class="world-intro-stat">
            <span class="world-intro-stat-label">LEVELS</span>
            <span class="world-intro-stat-value">${world.levelCount}</span>
          </div>
        `
        : "";

      this.root.className = "world-intro-overlay " + themeClass;

      this.root.innerHTML = `
        <div class="world-intro-backdrop" style="--world-intro-background: ${background}"></div>

        <div class="world-intro-particles" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div class="world-intro-panel" style="--world-intro-accent: ${accent}">
          <div class="world-intro-emblem" aria-hidden="true">
            <span class="world-intro-emblem-ring"></span>
            <span class="world-intro-emblem-ring"></span>
            <span class="world-intro-emblem-center">${world.number}</span>
          </div>

          <p class="world-intro-eyebrow">NEW WORLD UNLOCKED</p>

          <h2 class="world-intro-title" id="world-intro-title">
            ${this.escapeHtml(world.name)}
          </h2>

          ${subtitle}

          <p class="world-intro-description" id="world-intro-description">
            ${description}
          </p>

          <div class="world-intro-stats">
            ${difficulty}
            ${levels}
          </div>

          <div class="world-intro-progress" aria-hidden="true">
            <span data-world-intro-progress></span>
          </div>

          <div class="world-intro-actions" data-world-intro-actions></div>
        </div>
      `;

      this.progressElement = this.root.querySelector(
        "[data-world-intro-progress]"
      );

      this.actionsElement = this.root.querySelector(
        "[data-world-intro-actions]"
      );
    },

    renderContinueButton(generation) {
      if (!this.actionsElement) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "world-intro-continue";
      button.textContent = "Explore World";

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
        this.timeoutId !== null ||
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
          callback(this.currentWorld);
        } catch (error) {
          this.reportError(error);
        }
      }

      if (typeof resolve === "function") {
        resolve({
          completed: true,
          cancelled: false,
          world: this.currentWorld
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
          world: this.currentWorld
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

    getThemeClass(theme) {
      const normalized = String(theme || "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");

      return normalized ? "world-theme-" + normalized : "world-theme-default";
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

    getCurrentWorld() {
      return this.currentWorld;
    },

    reportError(error) {
      if (
        global.SnakeLogger &&
        typeof global.SnakeLogger.error === "function"
      ) {
        global.SnakeLogger.error("World intro callback failed.", error);
      }
    },

    destroy() {
      this.cancel();

      if (this.root && this.root.dataset.worldIntro !== undefined) {
        this.root.remove();
      }

      this.root = null;
      this.progressElement = null;
      this.actionsElement = null;
      this.currentWorld = null;
    }
  };

  global.SnakeWorldIntro = SnakeWorldIntro;
})(window);