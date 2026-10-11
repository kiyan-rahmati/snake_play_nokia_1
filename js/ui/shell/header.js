(function (global) {
  "use strict";

  class SnakeHeader {
    constructor(options) {
      const settings = options || {};

      this.root = settings.root || document.querySelector("[data-app-header]");
      this.title = settings.title || "Nokia Snake";
      this.subtitle = settings.subtitle || "Classic mode";
      this.logo = settings.logo || "🐍";
      this.language = settings.language || "en";
      this.theme = settings.theme || "night";
      this.score = Number(settings.score) || 0;
      this.level = Number(settings.level) || 1;
      this.listeners = new Map();
      this.boundClick = this.handleClick.bind(this);
      this.boundKeydown = this.handleKeydown.bind(this);
      this.destroyed = false;

      this.elements = {
        title: null,
        subtitle: null,
        score: null,
        level: null,
        menuButton: null,
        themeButton: null,
        languageButton: null
      };

      if (this.root) {
        this.mount();
      }
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeHeader has been destroyed.");
      }
    }

    mount() {
      this.assertAlive();

      if (!this.root) {
        return false;
      }

      this.root.classList.add("snake-header");
      this.root.setAttribute("role", "banner");

      this.root.innerHTML = `
        <div class="snake-header__brand">
          <span class="snake-header__logo" aria-hidden="true"></span>
          <div class="snake-header__identity">
            <h1 class="snake-header__title"></h1>
            <p class="snake-header__subtitle"></p>
          </div>
        </div>

        <div class="snake-header__status">
          <div class="snake-header__stat">
            <span class="snake-header__stat-label" data-i18n="score">Score</span>
            <strong class="snake-header__score">0</strong>
          </div>

          <div class="snake-header__stat">
            <span class="snake-header__stat-label" data-i18n="level">Level</span>
            <strong class="snake-header__level">1</strong>
          </div>
        </div>

        <nav class="snake-header__actions" aria-label="Application controls">
          <button
            class="snake-header__button"
            type="button"
            data-action="toggle-theme"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <span aria-hidden="true">◐</span>
          </button>

          <button
            class="snake-header__button"
            type="button"
            data-action="toggle-language"
            aria-label="Change language"
            title="Change language"
          >
            <span class="snake-header__language-label">EN</span>
          </button>

          <button
            class="snake-header__button snake-header__menu-button"
            type="button"
            data-action="toggle-menu"
            aria-label="Open navigation"
            aria-expanded="false"
            title="Open navigation"
          >
            <span aria-hidden="true">☰</span>
          </button>
        </nav>
      `;

      this.elements.title = this.root.querySelector(".snake-header__title");
      this.elements.subtitle = this.root.querySelector(".snake-header__subtitle");
      this.elements.logo = this.root.querySelector(".snake-header__logo");
      this.elements.score = this.root.querySelector(".snake-header__score");
      this.elements.level = this.root.querySelector(".snake-header__level");
      this.elements.menuButton = this.root.querySelector('[data-action="toggle-menu"]');
      this.elements.themeButton = this.root.querySelector('[data-action="toggle-theme"]');
      this.elements.languageButton = this.root.querySelector('[data-action="toggle-language"]');

      this.root.addEventListener("click", this.boundClick);
      this.root.addEventListener("keydown", this.boundKeydown);

      this.render();
      this.emit("mounted", { root: this.root });

      return true;
    }

    render() {
      this.assertAlive();

      if (!this.root) {
        return false;
      }

      if (this.elements.title) {
        this.elements.title.textContent = this.title;
      }

      if (this.elements.subtitle) {
        this.elements.subtitle.textContent = this.subtitle;
      }

      if (this.elements.logo) {
        this.elements.logo.textContent = this.logo;
      }

      if (this.elements.score) {
        this.elements.score.textContent = String(this.score);
      }

      if (this.elements.level) {
        this.elements.level.textContent = String(this.level);
      }

      if (this.elements.languageButton) {
        const label = this.elements.languageButton.querySelector(
          ".snake-header__language-label"
        );

        if (label) {
          label.textContent = this.language.toUpperCase();
        }
      }

      this.root.dataset.theme = this.theme;
      this.root.dataset.language = this.language;

      return true;
    }

    setTitle(title, subtitle) {
      this.assertAlive();

      if (typeof title === "string") {
        this.title = title;
      }

      if (typeof subtitle === "string") {
        this.subtitle = subtitle;
      }

      this.render();
    }

    setLogo(logo) {
      this.assertAlive();

      if (typeof logo !== "string") {
        return false;
      }

      this.logo = logo;
      this.render();

      return true;
    }

    setScore(score) {
      this.assertAlive();

      const value = Number(score);

      if (!Number.isFinite(value)) {
        return false;
      }

      this.score = Math.max(0, Math.floor(value));
      this.render();

      this.emit("score-updated", { score: this.score });

      return true;
    }

    setLevel(level) {
      this.assertAlive();

      const value = Number(level);

      if (!Number.isFinite(value) || value < 1) {
        return false;
      }

      this.level = Math.floor(value);
      this.render();

      this.emit("level-updated", { level: this.level });

      return true;
    }

    setTheme(theme) {
      this.assertAlive();

      if (typeof theme !== "string" || !theme.trim()) {
        return false;
      }

      this.theme = theme;
      this.render();

      this.emit("theme-changed", { theme: this.theme });

      return true;
    }

    setLanguage(language) {
      this.assertAlive();

      if (!["en", "fa"].includes(language)) {
        return false;
      }

      this.language = language;
      this.render();

      this.emit("language-changed", {
        language: this.language
      });

      return true;
    }

    setMenuExpanded(expanded) {
      this.assertAlive();

      if (!this.elements.menuButton) {
        return false;
      }

      const value = Boolean(expanded);

      this.elements.menuButton.setAttribute(
        "aria-expanded",
        String(value)
      );

      this.elements.menuButton.setAttribute(
        "aria-label",
        value ? "Close navigation" : "Open navigation"
      );

      this.emit("menu-toggled", { expanded: value });

      return value;
    }

    handleClick(event) {
      if (this.destroyed) {
        return;
      }

      const button = event.target.closest("button[data-action]");

      if (!button || !this.root.contains(button)) {
        return;
      }

      const action = button.dataset.action;

      switch (action) {
        case "toggle-theme":
          this.emit("theme-toggle-requested", {
            currentTheme: this.theme
          });
          break;

        case "toggle-language":
          this.emit("language-toggle-requested", {
            currentLanguage: this.language
          });
          break;

        case "toggle-menu": {
          const expanded =
            button.getAttribute("aria-expanded") === "true";

          this.setMenuExpanded(!expanded);
          break;
        }

        default:
          this.emit("action", {
            action: action,
            button: button
          });
      }
    }

    handleKeydown(event) {
      if (this.destroyed || event.key !== "Escape") {
        return;
      }

      if (
        this.elements.menuButton &&
        this.elements.menuButton.getAttribute("aria-expanded") === "true"
      ) {
        this.setMenuExpanded(false);
        this.elements.menuButton.focus();
      }
    }

    on(eventName, callback) {
      this.assertAlive();

      if (typeof callback !== "function") {
        throw new TypeError("Callback must be a function.");
      }

      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, new Set());
      }

      this.listeners.get(eventName).add(callback);

      return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
      const callbacks = this.listeners.get(eventName);

      if (!callbacks) {
        return false;
      }

      const removed = callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.listeners.delete(eventName);
      }

      return removed;
    }

    emit(eventName, payload) {
      const callbacks = this.listeners.get(eventName);

      if (!callbacks) {
        return;
      }

      callbacks.forEach((callback) => {
        try {
          callback(payload || {});
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error("[SnakeHeader]", error);
          }
        }
      });
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.root) {
        this.root.removeEventListener("click", this.boundClick);
        this.root.removeEventListener("keydown", this.boundKeydown);
      }

      this.listeners.clear();
      this.elements = {};
      this.root = null;
      this.destroyed = true;
    }
  }

  global.SnakeHeader = SnakeHeader;
})(window);