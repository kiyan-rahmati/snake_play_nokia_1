(function (global) {
  "use strict";

  const SnakeGamePage = {
    root: null,
    elements: {},
    initialized: false,
    unsubscribe: [],
    state: {
      status: "idle",
      score: 0,
      level: 1,
      world: 1,
      speed: 1,
      paused: false,
      startedAt: null
    },

    init(root) {
      if (this.initialized) {
        if (root) this.root = root;
        return this;
      }

      this.root = root || document.querySelector("[data-page='game']");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.page = "game";
        this.root.className = "game-page";
      }

      this.render();
      this.cacheElements();
      this.bindEvents();
      this.syncFromEngine();

      this.initialized = true;
      return this;
    },

    render() {
      this.root.innerHTML = `
        <section class="game-layout" aria-label="Snake game">
          <header class="game-toolbar">
            <button type="button" class="game-back-button" data-action="back">
              <span aria-hidden="true">←</span>
              <span data-i18n="game.back">Back</span>
            </button>

            <div class="game-title">
              <span class="game-title-icon" aria-hidden="true">▦</span>
              <h1 data-i18n="game.title">Snake</h1>
            </div>

            <button
              type="button"
              class="game-pause-button"
              data-action="pause"
              aria-label="Pause game"
              aria-pressed="false"
            >
              <span aria-hidden="true">Ⅱ</span>
              <span data-pause-label>Pause</span>
            </button>
          </header>

          <div class="game-status-bar" aria-live="polite">
            <div class="game-status-item">
              <span class="game-status-label" data-i18n="game.score">Score</span>
              <strong data-game-score>0</strong>
            </div>

            <div class="game-status-item">
              <span class="game-status-label" data-i18n="game.best">Best</span>
              <strong data-game-best>0</strong>
            </div>

            <div class="game-status-item">
              <span class="game-status-label" data-i18n="game.level">Level</span>
              <strong data-game-level>1</strong>
            </div>

            <div class="game-status-item">
              <span class="game-status-label" data-i18n="game.world">World</span>
              <strong data-game-world>1</strong>
            </div>
          </div>

          <div class="game-board-wrapper">
            <div class="game-board-frame">
              <canvas
                class="game-canvas"
                data-game-canvas
                width="480"
                height="480"
                tabindex="0"
                role="img"
                aria-label="Snake game board. Use arrow keys or WASD to move."
              ></canvas>

              <div class="game-overlay-slot" data-game-overlay></div>
            </div>

            <div class="game-message" data-game-message aria-live="polite">
              Ready when you are.
            </div>
          </div>

          <div class="game-controls">
            <div class="game-primary-actions">
              <button type="button" class="game-start-button" data-action="start">
                <span aria-hidden="true">▶</span>
                <span data-start-label>Start Game</span>
              </button>

              <button type="button" class="game-restart-button" data-action="restart">
                <span aria-hidden="true">↻</span>
                <span data-i18n="game.restart">Restart</span>
              </button>
            </div>

            <div class="game-dpad" role="group" aria-label="Movement controls">
              <button type="button" data-direction="up" aria-label="Move up">▲</button>
              <button type="button" data-direction="left" aria-label="Move left">◀</button>
              <button type="button" data-direction="down" aria-label="Move down">▼</button>
              <button type="button" data-direction="right" aria-label="Move right">▶</button>
            </div>

            <p class="game-control-hint" data-i18n="game.controlsHint">
              Use arrow keys or WASD to move. Press Space to pause.
            </p>
          </div>

          <footer class="game-footer">
            <span data-game-session-time>00:00</span>
            <span class="game-footer-separator" aria-hidden="true">•</span>
            <span data-game-speed>Speed ×1</span>
            <span class="game-footer-separator" aria-hidden="true">•</span>
            <span data-game-status-text>Ready</span>
          </footer>
        </section>
      `;
    },

    cacheElements() {
      this.elements = {
        canvas: this.root.querySelector("[data-game-canvas]"),
        score: this.root.querySelector("[data-game-score]"),
        best: this.root.querySelector("[data-game-best]"),
        level: this.root.querySelector("[data-game-level]"),
        world: this.root.querySelector("[data-game-world]"),
        message: this.root.querySelector("[data-game-message]"),
        overlay: this.root.querySelector("[data-game-overlay]"),
        startButton: this.root.querySelector("[data-action='start']"),
        pauseButton: this.root.querySelector("[data-action='pause']"),
        restartButton: this.root.querySelector("[data-action='restart']"),
        startLabel: this.root.querySelector("[data-start-label]"),
        pauseLabel: this.root.querySelector("[data-pause-label]"),
        sessionTime: this.root.querySelector("[data-game-session-time]"),
        speed: this.root.querySelector("[data-game-speed]"),
        statusText: this.root.querySelector("[data-game-status-text]"),
        backButton: this.root.querySelector("[data-action='back']")
      };
    },

    bindEvents() {
      this.handleClick = this.handleClick.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handleGameEvent = this.handleGameEvent.bind(this);

      this.root.addEventListener("click", this.handleClick);
      this.root.addEventListener("keydown", this.handleKeydown);

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.on === "function") {
        const events = [
          "game:started",
          "game:paused",
          "game:resumed",
          "game:over",
          "game:score",
          "game:tick",
          "game:level-changed",
          "game:world-changed",
          "game:state-changed"
        ];

        events.forEach((eventName) => {
          const result = bus.on(eventName, (payload) => {
            this.handleGameEvent(eventName, payload);
          });

          if (typeof result === "function") {
            this.unsubscribe.push(result);
          } else if (typeof bus.off === "function") {
            this.unsubscribe.push(() => bus.off(eventName, this.handleGameEvent));
          }
        });
      }

      const lifecycle = global.SnakeAppLifecycle;

      if (lifecycle && typeof lifecycle.on === "function") {
        const off = lifecycle.on("page:shown", (payload) => {
          if (!payload || payload.page === "game") {
            this.syncFromEngine();
          }
        });

        if (typeof off === "function") {
          this.unsubscribe.push(off);
        }
      }
    },

    handleClick(event) {
      const actionElement = event.target.closest("[data-action], [data-direction]");

      if (!actionElement || !this.root.contains(actionElement)) return;

      const action = actionElement.dataset.action;
      const direction = actionElement.dataset.direction;

      if (direction) {
        this.changeDirection(direction);
        return;
      }

      switch (action) {
        case "start":
          this.startGame();
          break;

        case "pause":
          this.togglePause();
          break;

        case "restart":
          this.restartGame();
          break;

        case "back":
          this.navigateBack();
          break;

        default:
          break;
      }
    },

    handleKeydown(event) {
      if (event.defaultPrevented) return;

      const target = event.target;

      if (
        target &&
        target.matches &&
        target.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const directions = {
        arrowup: "up",
        w: "up",
        arrowdown: "down",
        s: "down",
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right"
      };

      if (directions[key]) {
        event.preventDefault();
        this.changeDirection(directions[key]);
        return;
      }

      if (key === " " || key === "spacebar") {
        event.preventDefault();
        this.togglePause();
        return;
      }

      if (key === "enter" && this.state.status !== "running") {
        event.preventDefault();
        this.startGame();
      }
    },

    handleGameEvent(eventName, payload) {
      const data = payload && typeof payload === "object" ? payload : {};

      switch (eventName) {
        case "game:started":
          this.state.status = "running";
          this.state.paused = false;
          this.state.startedAt = Date.now();
          this.setMessage("Good luck. Don't hit yourself!");
          break;

        case "game:paused":
          this.state.status = "paused";
          this.state.paused = true;
          this.setMessage("Game paused.");
          break;

        case "game:resumed":
          this.state.status = "running";
          this.state.paused = false;
          this.setMessage("Keep going!");
          break;

        case "game:over":
          this.state.status = "over";
          this.state.paused = false;
          this.setMessage("Game over. Give it another try!");
          break;

        case "game:score":
          if (Number.isFinite(data.score)) {
            this.state.score = data.score;
          }
          break;

        case "game:tick":
          if (Number.isFinite(data.score)) {
            this.state.score = data.score;
          }
          if (Number.isFinite(data.level)) {
            this.state.level = data.level;
          }
          if (Number.isFinite(data.world)) {
            this.state.world = data.world;
          }
          if (Number.isFinite(data.speed)) {
            this.state.speed = data.speed;
          }
          break;

        case "game:level-changed":
          if (Number.isFinite(data.level)) {
            this.state.level = data.level;
          }
          break;

        case "game:world-changed":
          if (Number.isFinite(data.world)) {
            this.state.world = data.world;
          }
          break;

        case "game:state-changed":
          this.applyState(data);
          break;

        default:
          break;
      }

      this.updateStatus();
    },

    applyState(data) {
      if (typeof data.status === "string") {
        this.state.status = data.status;
      }

      if (typeof data.paused === "boolean") {
        this.state.paused = data.paused;
      }

      ["score", "level", "world", "speed"].forEach((key) => {
        if (Number.isFinite(data[key])) {
          this.state[key] = data[key];
        }
      });
    },

    startGame() {
      if (this.state.status === "running" && !this.state.paused) return;

      const engine = global.SnakeGameEngine;

      if (engine && typeof engine.start === "function") {
        engine.start();
        this.state.status = "running";
        this.state.paused = false;
        this.state.startedAt = this.state.startedAt || Date.now();
        this.setMessage("Good luck. Don't hit yourself!");
        this.updateStatus();
        return;
      }

      const app = global.SnakeApp;

      if (app && typeof app.startGame === "function") {
        app.startGame();
        this.state.status = "running";
        this.state.paused = false;
        this.state.startedAt = Date.now();
        this.updateStatus();
        return;
      }

      this.setMessage("Game engine is not available.");
    },

    togglePause() {
      if (this.state.status === "idle" || this.state.status === "over") {
        this.startGame();
        return;
      }

      const engine = global.SnakeGameEngine;

      if (this.state.paused || this.state.status === "paused") {
        if (engine && typeof engine.resume === "function") {
          engine.resume();
        } else if (engine && typeof engine.start === "function") {
          engine.start();
        }

        this.state.status = "running";
        this.state.paused = false;
        this.setMessage("Keep going!");
      } else {
        if (engine && typeof engine.pause === "function") {
          engine.pause();
        }

        this.state.status = "paused";
        this.state.paused = true;
        this.setMessage("Game paused.");
      }

      this.updateStatus();
    },

    restartGame() {
      const engine = global.SnakeGameEngine;

      if (engine && typeof engine.restart === "function") {
        engine.restart();
      } else if (engine && typeof engine.reset === "function") {
        engine.reset();
        if (typeof engine.start === "function") {
          engine.start();
        }
      } else {
        const app = global.SnakeApp;
        if (app && typeof app.restartGame === "function") {
          app.restartGame();
        } else {
          this.setMessage("Restart is not available right now.");
          return;
        }
      }

      this.state = {
        status: "running",
        score: 0,
        level: 1,
        world: 1,
        speed: 1,
        paused: false,
        startedAt: Date.now()
      };

      this.setMessage("New game. Let's go!");
      this.updateStatus();
    },

    changeDirection(direction) {
      const input = global.SnakeInputManager;

      if (input && typeof input.setDirection === "function") {
        input.setDirection(direction);
        return;
      }

      const keyboard = global.SnakeKeyboardInput;

      if (keyboard && typeof keyboard.setDirection === "function") {
        keyboard.setDirection(direction);
        return;
      }

      const engine = global.SnakeGameEngine;

      if (engine && typeof engine.changeDirection === "function") {
        engine.changeDirection(direction);
        return;
      }

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.emit === "function") {
        bus.emit("input:direction", { direction: direction });
      }
    },

    navigateBack() {
      const router = global.SnakeRouter;

      if (router && typeof router.navigate === "function") {
        router.navigate("home");
        return;
      }

      if (router && typeof router.go === "function") {
        router.go("home");
        return;
      }

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.emit === "function") {
        bus.emit("navigation:request", { page: "home" });
      }
    },

    syncFromEngine() {
      const engine = global.SnakeGameEngine;

      if (!engine) {
        this.updateStatus();
        return;
      }

      let snapshot = null;

      if (typeof engine.getState === "function") {
        snapshot = engine.getState();
      } else if (typeof engine.getSnapshot === "function") {
        snapshot = engine.getSnapshot();
      } else if (engine.state && typeof engine.state === "object") {
        snapshot = engine.state;
      }

      if (snapshot && typeof snapshot === "object") {
        this.applyState(snapshot);
      }

      const records = global.SnakeHighScoreManager;

      if (records) {
        let best = null;

        if (typeof records.getBest === "function") {
          best = records.getBest();
        } else if (typeof records.getHighScore === "function") {
          best = records.getHighScore();
        }

        if (Number.isFinite(best)) {
          this.elements.best.textContent = String(best);
        }
      }

      this.updateStatus();
    },

    updateStatus() {
      if (!this.elements.score) return;

      this.elements.score.textContent = String(this.state.score);
      this.elements.level.textContent = String(this.state.level);
      this.elements.world.textContent = String(this.state.world);
      this.elements.speed.textContent = "Speed ×" + this.state.speed;

      const running = this.state.status === "running" && !this.state.paused;
      const paused = this.state.paused || this.state.status === "paused";
      const ended = this.state.status === "over";

      this.elements.pauseButton.disabled =
        this.state.status === "idle" || ended;

      this.elements.pauseButton.setAttribute(
        "aria-pressed",
        paused ? "true" : "false"
      );

      this.elements.pauseLabel.textContent = paused ? "Resume" : "Pause";

      this.elements.startButton.disabled = running;
      this.elements.startLabel.textContent = running
        ? "Playing"
        : paused
          ? "Resume Game"
          : ended
            ? "Play Again"
            : "Start Game";

      this.elements.statusText.textContent = paused
        ? "Paused"
        : running
          ? "Playing"
          : ended
            ? "Game Over"
            : "Ready";

      if (this.state.startedAt && running) {
        this.elements.sessionTime.textContent = this.formatDuration(
          Date.now() - this.state.startedAt
        );
      }
    },

    setMessage(message) {
      if (this.elements.message) {
        this.elements.message.textContent = message;
      }
    },

    formatDuration(milliseconds) {
      const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0")
      );
    },

    showOverlay(content) {
      if (!this.elements.overlay) return;

      this.elements.overlay.textContent = "";
      if (content instanceof Node) {
        this.elements.overlay.appendChild(content);
      } else if (typeof content === "string") {
        this.elements.overlay.textContent = content;
      }
    },

    hideOverlay() {
      if (this.elements.overlay) {
        this.elements.overlay.textContent = "";
      }
    },

    destroy() {
      this.root?.removeEventListener("click", this.handleClick);
      this.root?.removeEventListener("keydown", this.handleKeydown);

      this.unsubscribe.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (_) {
          // Ignore cleanup errors.
        }
      });

      this.unsubscribe = [];
      this.elements = {};
      this.initialized = false;
      this.root = null;
    }
  };

  global.SnakeGamePage = SnakeGamePage;
})(window);