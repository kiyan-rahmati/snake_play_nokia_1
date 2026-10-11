(function (global) {
  "use strict";

  const SnakePauseOverlay = {
    root: null,
    visible: false,
    onResume: null,
    onRestart: null,
    onSettings: null,
    onQuit: null,
    previousFocus: null,
    keydownHandler: null,
    actionButtons: [],

    init(root) {
      if (this.root) return this;

      this.root = root || document.querySelector("[data-pause-overlay]");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.pauseOverlay = "";
        this.root.className = "pause-overlay";
        this.root.hidden = true;

        const host =
          document.querySelector("[data-game-overlay]") ||
          document.querySelector(".game-board-frame") ||
          document.body;

        host.appendChild(this.root);
      }

      this.root.setAttribute("role", "dialog");
      this.root.setAttribute("aria-modal", "true");
      this.root.setAttribute("aria-labelledby", "pause-overlay-title");
      this.root.setAttribute("aria-describedby", "pause-overlay-description");

      this.bindKeyboard();
      return this;
    },

    show(options) {
      options = options || {};

      this.init(options.root);

      if (this.visible) return this;

      this.visible = true;
      this.previousFocus = document.activeElement;

      this.onResume = this.getCallback(options, "onResume");
      this.onRestart = this.getCallback(options, "onRestart");
      this.onSettings = this.getCallback(options, "onSettings");
      this.onQuit = this.getCallback(options, "onQuit");

      this.render(options);
      this.setVisible(true);
      this.bindActions();

      const resumeButton = this.root.querySelector(
        '[data-pause-action="resume"]'
      );

      if (resumeButton) resumeButton.focus();

      this.emit("pause-overlay:shown");

      return this;
    },

    render(options) {
      const title = this.escapeHtml(options.title || "Game Paused");
      const description = this.escapeHtml(
        options.description || "Take a breath. Your adventure is waiting."
      );

      const showRestart = options.showRestart !== false;
      const showSettings = options.showSettings !== false;
      const showQuit = options.showQuit !== false;

      this.root.innerHTML = `
        <div class="pause-overlay-backdrop"></div>

        <div class="pause-overlay-panel">
          <div class="pause-overlay-icon" aria-hidden="true">
            <span></span>
            <span></span>
          </div>

          <p class="pause-overlay-eyebrow">PAUSE MENU</p>

          <h2 class="pause-overlay-title" id="pause-overlay-title">
            ${title}
          </h2>

          <p class="pause-overlay-description" id="pause-overlay-description">
            ${description}
          </p>

          <div class="pause-overlay-actions">
            <button
              type="button"
              class="pause-overlay-button pause-overlay-button-primary"
              data-pause-action="resume"
            >
              <span class="pause-overlay-button-icon" aria-hidden="true">▶</span>
              <span>Resume Game</span>
            </button>

            ${
              showRestart
                ? `
                  <button
                    type="button"
                    class="pause-overlay-button"
                    data-pause-action="restart"
                  >
                    <span class="pause-overlay-button-icon" aria-hidden="true">↻</span>
                    <span>Restart Game</span>
                  </button>
                `
                : ""
            }

            ${
              showSettings
                ? `
                  <button
                    type="button"
                    class="pause-overlay-button"
                    data-pause-action="settings"
                  >
                    <span class="pause-overlay-button-icon" aria-hidden="true">⚙</span>
                    <span>Settings</span>
                  </button>
                `
                : ""
            }

            ${
              showQuit
                ? `
                  <button
                    type="button"
                    class="pause-overlay-button pause-overlay-button-secondary"
                    data-pause-action="quit"
                  >
                    <span class="pause-overlay-button-icon" aria-hidden="true">⌂</span>
                    <span>Exit to Menu</span>
                  </button>
                `
                : ""
            }
          </div>

          <p class="pause-overlay-hint">
            Press <kbd>Esc</kbd> to resume
          </p>
        </div>
      `;
    },

    bindActions() {
      this.actionButtons = Array.from(
        this.root.querySelectorAll("[data-pause-action]")
      );

      this.actionButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.handleAction(button.dataset.pauseAction);
        });
      });
    },

    handleAction(action) {
      if (!this.visible) return;

      switch (action) {
        case "resume":
          this.resume();
          break;

        case "restart":
          this.invoke(this.onRestart, "restart");
          break;

        case "settings":
          this.invoke(this.onSettings, "settings");
          break;

        case "quit":
          this.invoke(this.onQuit, "quit");
          break;

        default:
          break;
      }
    },

    resume() {
      if (!this.visible) return;

      const callback = this.onResume;

      this.hide();
      this.invoke(callback, "resume");
      this.emit("pause-overlay:resume");
    },

    hide() {
      if (!this.visible) return;

      this.visible = false;
      this.setVisible(false);
      this.removeKeyboard();

      if (
        this.previousFocus &&
        typeof this.previousFocus.focus === "function" &&
        document.contains(this.previousFocus)
      ) {
        this.previousFocus.focus();
      }

      this.previousFocus = null;
      this.actionButtons = [];

      this.emit("pause-overlay:hidden");
    },

    toggle(options) {
      if (this.visible) {
        this.resume();
      } else {
        this.show(options);
      }

      return this.visible;
    },

    setVisible(visible) {
      if (!this.root) return;

      this.root.hidden = !visible;
      this.root.setAttribute("aria-hidden", visible ? "false" : "true");
      this.root.classList.toggle("is-visible", visible);
      this.root.classList.toggle("is-hidden", !visible);
    },

    bindKeyboard() {
      if (this.keydownHandler) return;

      this.keydownHandler = (event) => {
        if (!this.visible) return;

        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          this.resume();
          return;
        }

        if (event.key !== "Tab") return;

        const focusable = this.getFocusableElements();

        if (!focusable.length) {
          event.preventDefault();
          this.root.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      };

      document.addEventListener("keydown", this.keydownHandler, true);
    },

    removeKeyboard() {
      if (!this.keydownHandler) return;

      document.removeEventListener("keydown", this.keydownHandler, true);
      this.keydownHandler = null;
    },

    getFocusableElements() {
      if (!this.root) return [];

      return Array.from(
        this.root.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => {
        return (
          !element.hidden &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0
        );
      });
    },

    getCallback(options, name) {
      return typeof options[name] === "function" ? options[name] : null;
    },

    invoke(callback, action) {
      if (typeof callback !== "function") return;

      try {
        callback({
          action,
          overlay: this
        });
      } catch (error) {
        this.reportError(error);
      }
    },

    emit(name, detail) {
      const payload = Object.assign(
        {
          visible: this.visible
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

    reportError(error) {
      if (
        global.SnakeLogger &&
        typeof global.SnakeLogger.error === "function"
      ) {
        global.SnakeLogger.error("Pause overlay action failed.", error);
      }
    },

    isVisible() {
      return this.visible;
    },

    destroy() {
      this.hide();
      this.removeKeyboard();

      if (this.root && this.root.dataset.pauseOverlay !== undefined) {
        this.root.remove();
      }

      this.root = null;
      this.previousFocus = null;
      this.onResume = null;
      this.onRestart = null;
      this.onSettings = null;
      this.onQuit = null;
      this.actionButtons = [];
    }
  };

  global.SnakePauseOverlay = SnakePauseOverlay;
})(window);