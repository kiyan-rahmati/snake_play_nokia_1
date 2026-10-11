(function (global) {
  "use strict";

  const SnakeGameOverOverlay = {
    root: null,
    visible: false,
    currentResult: null,
    previousFocus: null,
    actionButtons: [],
    keydownHandler: null,
    onRestart: null,
    onMainMenu: null,
    onViewRecords: null,
    onShare: null,

    init(root) {
      if (this.root) return this;

      this.root = root || document.querySelector("[data-game-over-overlay]");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.gameOverOverlay = "";
        this.root.className = "game-over-overlay";
        this.root.hidden = true;

        const host =
          document.querySelector("[data-game-overlay]") ||
          document.querySelector(".game-board-frame") ||
          document.body;

        host.appendChild(this.root);
      }

      this.root.setAttribute("role", "dialog");
      this.root.setAttribute("aria-modal", "true");
      this.root.setAttribute("aria-labelledby", "game-over-title");
      this.root.setAttribute("aria-describedby", "game-over-description");

      this.bindKeyboard();

      return this;
    },

    show(result, options) {
      options = options || {};

      this.init(options.root);

      if (this.visible) {
        this.hide();
      }

      this.visible = true;
      this.previousFocus = document.activeElement;
      this.currentResult = this.normalizeResult(result);

      this.onRestart = this.getCallback(options, "onRestart");
      this.onMainMenu = this.getCallback(options, "onMainMenu");
      this.onViewRecords = this.getCallback(options, "onViewRecords");
      this.onShare = this.getCallback(options, "onShare");

      this.render(this.currentResult, options);
      this.setVisible(true);
      this.bindActions();

      const restartButton = this.root.querySelector(
        '[data-game-over-action="restart"]'
      );

      if (restartButton) restartButton.focus();

      this.emit("game-over:shown", this.currentResult);

      return this;
    },

    normalizeResult(result) {
      result = result && typeof result === "object" ? result : {};

      const score = Number(result.score ?? 0);
      const highScore = Number(result.highScore ?? result.bestScore ?? 0);
      const foodEaten = Number(result.foodEaten ?? result.foodsEaten ?? 0);
      const duration = Number(result.duration ?? result.elapsedTime ?? 0);
      const level = Number(result.level ?? 1);
      const world = Number(result.world ?? result.worldNumber ?? 1);

      return {
        reason: this.safeText(result.reason || "collision"),
        title: this.safeText(result.title || ""),
        message: this.safeText(result.message || ""),
        score: this.nonNegativeInteger(score),
        highScore: this.nonNegativeInteger(highScore),
        foodEaten: this.nonNegativeInteger(foodEaten),
        duration: this.nonNegativeNumber(duration),
        level: Math.max(1, this.nonNegativeInteger(level)),
        world: Math.max(1, this.nonNegativeInteger(world)),
        newRecord: result.newRecord === true,
        completed: result.completed === true,
        achievements: Array.isArray(result.achievements)
          ? result.achievements.slice(0, 10).map((item) => this.safeText(
              typeof item === "string" ? item : item && item.name || ""
            ))
          : []
      };
    },

    render(result, options) {
      const title = result.title || this.getTitle(result);
      const message = result.message || this.getMessage(result);
      const formattedDuration = this.formatDuration(result.duration);

      const achievements = result.achievements.length
        ? `
          <div class="game-over-achievements">
            <h3>Achievements unlocked</h3>
            <ul>
              ${result.achievements.map((achievement) => `
                <li>${this.escapeHtml(achievement)}</li>
              `).join("")}
            </ul>
          </div>
        `
        : "";

      const recordNotice = result.newRecord
        ? `
          <div class="game-over-record" role="status">
            <span aria-hidden="true">★</span>
            <span>NEW HIGH SCORE!</span>
          </div>
        `
        : "";

      const completedNotice = result.completed
        ? `<p class="game-over-completed">CHALLENGE COMPLETED</p>`
        : "";

      const showRecords = options.showRecords !== false;
      const showShare = options.showShare === true;
      const showMainMenu = options.showMainMenu !== false;

      this.root.innerHTML = `
        <div class="game-over-backdrop"></div>

        <div class="game-over-panel">
          <div class="game-over-symbol" aria-hidden="true">
            <span class="game-over-symbol-line"></span>
            <span class="game-over-symbol-line"></span>
          </div>

          <p class="game-over-eyebrow">GAME OVER</p>

          ${completedNotice}

          <h2 class="game-over-title" id="game-over-title">
            ${this.escapeHtml(title)}
          </h2>

          <p class="game-over-description" id="game-over-description">
            ${this.escapeHtml(message)}
          </p>

          ${recordNotice}

          <div class="game-over-stats">
            <div class="game-over-stat game-over-stat-primary">
              <span class="game-over-stat-label">FINAL SCORE</span>
              <strong class="game-over-stat-value">${this.formatNumber(result.score)}</strong>
            </div>

            <div class="game-over-stat">
              <span class="game-over-stat-label">BEST SCORE</span>
              <strong class="game-over-stat-value">${this.formatNumber(result.highScore)}</strong>
            </div>

            <div class="game-over-stat">
              <span class="game-over-stat-label">FOOD EATEN</span>
              <strong class="game-over-stat-value">${this.formatNumber(result.foodEaten)}</strong>
            </div>

            <div class="game-over-stat">
              <span class="game-over-stat-label">SURVIVAL TIME</span>
              <strong class="game-over-stat-value">${formattedDuration}</strong>
            </div>
          </div>

          <div class="game-over-context">
            <span>World ${result.world}</span>
            <span aria-hidden="true">·</span>
            <span>Level ${result.level}</span>
          </div>

          ${achievements}

          <div class="game-over-actions">
            <button
              type="button"
              class="game-over-button game-over-button-primary"
              data-game-over-action="restart"
            >
              <span aria-hidden="true">↻</span>
              <span>Play Again</span>
            </button>

            ${
              showRecords
                ? `
                  <button
                    type="button"
                    class="game-over-button"
                    data-game-over-action="records"
                  >
                    <span aria-hidden="true">▤</span>
                    <span>View Records</span>
                  </button>
                `
                : ""
            }

            ${
              showShare
                ? `
                  <button
                    type="button"
                    class="game-over-button"
                    data-game-over-action="share"
                  >
                    <span aria-hidden="true">↗</span>
                    <span>Share Score</span>
                  </button>
                `
                : ""
            }

            ${
              showMainMenu
                ? `
                  <button
                    type="button"
                    class="game-over-button game-over-button-secondary"
                    data-game-over-action="menu"
                  >
                    <span aria-hidden="true">⌂</span>
                    <span>Main Menu</span>
                  </button>
                `
                : ""
            }
          </div>
        </div>
      `;
    },

    getTitle(result) {
      if (result.completed) return "Well Played!";
      if (result.newRecord) return "Amazing Run!";
      if (result.reason === "wall") return "Wall Collision!";
      if (result.reason === "self") return "Snake Collision!";
      if (result.reason === "obstacle") return "Obstacle Hit!";
      if (result.reason === "timeout") return "Time's Up!";
      if (result.reason === "quit") return "Run Ended";

      return "Game Over";
    },

    getMessage(result) {
      if (result.completed) {
        return "You completed the challenge. Great work!";
      }

      if (result.newRecord) {
        return "A new personal best. Can you beat it again?";
      }

      if (result.reason === "wall") {
        return "You hit the edge of the board. Watch your direction next time.";
      }

      if (result.reason === "self") {
        return "You ran into yourself. Plan your next move carefully.";
      }

      if (result.reason === "obstacle") {
        return "You hit an obstacle. Keep an eye on the path ahead.";
      }

      if (result.reason === "timeout") {
        return "The round has ended. Try another run!";
      }

      if (result.reason === "quit") {
        return "Your run has ended. Ready for another one?";
      }

      return "Every run is a chance to get better. Give it another try!";
    },

    bindActions() {
      this.actionButtons = Array.from(
        this.root.querySelectorAll("[data-game-over-action]")
      );

      this.actionButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.handleAction(button.dataset.gameOverAction);
        });
      });
    },

    handleAction(action) {
      if (!this.visible) return;

      const callbacks = {
        restart: this.onRestart,
        menu: this.onMainMenu,
        records: this.onViewRecords,
        share: this.onShare
      };

      const callback = callbacks[action];

      if (typeof callback !== "function") {
        if (action === "share") {
          this.shareResult();
        }

        return;
      }

      this.invoke(callback, action, this.currentResult);
    },

    shareResult() {
      if (!this.currentResult) return Promise.resolve(false);

      const result = this.currentResult;
      const shareData = {
        title: "Snake Game Score",
        text: "I scored " + result.score + " points in Snake!",
        url: global.location && global.location.href
          ? global.location.href
          : ""
      };

      if (global.navigator && typeof global.navigator.share === "function") {
        return global.navigator.share(shareData)
          .then(() => true)
          .catch((error) => {
            if (error && error.name === "AbortError") return false;

            return this.copyScoreText(shareData.text);
          });
      }

      return this.copyScoreText(shareData.text);
    },

    copyScoreText(text) {
      if (
        global.navigator &&
        global.navigator.clipboard &&
        typeof global.navigator.clipboard.writeText === "function"
      ) {
        return global.navigator.clipboard.writeText(text)
          .then(() => true)
          .catch(() => false);
      }

      return Promise.resolve(false);
    },

    hide() {
      if (!this.visible) return;

      this.visible = false;
      this.setVisible(false);

      if (
        this.previousFocus &&
        typeof this.previousFocus.focus === "function" &&
        document.contains(this.previousFocus)
      ) {
        this.previousFocus.focus();
      }

      this.previousFocus = null;
      this.actionButtons = [];

      this.emit("game-over:hidden", this.currentResult);
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
          return;
        }

        if (event.key === "Tab") {
          this.trapFocus(event);
        }
      };

      document.addEventListener("keydown", this.keydownHandler, true);
    },

    trapFocus(event) {
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

    invoke(callback, action, result) {
      try {
        callback({
          action,
          result,
          overlay: this
        });
      } catch (error) {
        this.reportError(error);
      }
    },

    emit(name, result) {
      const detail = {
        visible: this.visible,
        result: result || this.currentResult
      };

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit(name, detail);
      }

      if (typeof global.CustomEvent === "function") {
        global.dispatchEvent(
          new CustomEvent(name, {
            detail
          })
        );
      }
    },

    nonNegativeInteger(value) {
      if (!Number.isFinite(value)) return 0;
      return Math.max(0, Math.floor(value));
    },

    nonNegativeNumber(value) {
      if (!Number.isFinite(value)) return 0;
      return Math.max(0, value);
    },

    formatNumber(value) {
      const number = this.nonNegativeInteger(Number(value));

      try {
        return new Intl.NumberFormat().format(number);
      } catch (_) {
        return String(number);
      }
    },

    formatDuration(milliseconds) {
      const totalSeconds = Math.floor(
        this.nonNegativeNumber(milliseconds) / 1000
      );

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return [
          String(hours).padStart(2, "0"),
          String(minutes).padStart(2, "0"),
          String(seconds).padStart(2, "0")
        ].join(":");
      }

      return [
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
      ].join(":");
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

    reportError(error) {
      if (
        global.SnakeLogger &&
        typeof global.SnakeLogger.error === "function"
      ) {
        global.SnakeLogger.error("Game over overlay action failed.", error);
      }
    },

    isVisible() {
      return this.visible;
    },

    getResult() {
      return this.currentResult;
    },

    destroy() {
      this.hide();

      if (this.keydownHandler) {
        document.removeEventListener("keydown", this.keydownHandler, true);
        this.keydownHandler = null;
      }

      if (
        this.root &&
        this.root.dataset.gameOverOverlay !== undefined
      ) {
        this.root.remove();
      }

      this.root = null;
      this.currentResult = null;
      this.previousFocus = null;
      this.actionButtons = [];
      this.onRestart = null;
      this.onMainMenu = null;
      this.onViewRecords = null;
      this.onShare = null;
    }
  };

  global.SnakeGameOverOverlay = SnakeGameOverOverlay;
})(window);