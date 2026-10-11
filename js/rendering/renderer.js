(function (global) {
  "use strict";

  class SnakeRenderer {
    constructor(options) {
      const settings = options || {};

      this.canvas = settings.canvas || null;
      this.context = settings.context ||
        (this.canvas && this.canvas.getContext
          ? this.canvas.getContext("2d")
          : null);

      this.snakeRenderer = settings.snakeRenderer ||
        global.SnakeRenderer || null;

      this.gridRenderer = settings.gridRenderer ||
        global.SnakeGridRenderer || null;

      this.effectsRenderer = settings.effectsRenderer ||
        global.SnakeEffectsRenderer || null;

      this.backgroundColor = settings.backgroundColor || "#101820";
      this.foregroundColor = settings.foregroundColor || "#d7f7c2";
      this.gridColor = settings.gridColor || "rgba(215,247,194,0.08)";

      this.cellSize = Math.max(1, Number(settings.cellSize) || 20);
      this.width = 0;
      this.height = 0;
      this.pixelRatio = 1;
      this.initialized = false;
      this.destroyed = false;
      this.rendering = false;
      this.pendingFrame = null;
      this.lastFrameTime = 0;
      this.frameCount = 0;
      this.listeners = new Map();

      this.state = {
        snake: null,
        food: null,
        obstacles: [],
        effects: [],
        score: 0,
        level: 1,
        paused: false,
        gameOver: false
      };

      this.boundResize = this.handleResize.bind(this);

      if (this.canvas && this.context) {
        this.initialize();
      }
    }

    initialize() {
      this.assertAlive();

      if (!this.canvas || !this.context) {
        return false;
      }

      this.resizeCanvas();
      this.initialized = true;

      if (typeof global.addEventListener === "function") {
        global.addEventListener("resize", this.boundResize);
      }

      this.emit("initialized", {
        width: this.width,
        height: this.height
      });

      return true;
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeRenderer has been destroyed.");
      }
    }

    setCanvas(canvas) {
      this.assertAlive();

      if (!canvas || typeof canvas.getContext !== "function") {
        throw new TypeError("A valid canvas element is required.");
      }

      this.canvas = canvas;
      this.context = canvas.getContext("2d");

      if (!this.context) {
        throw new Error("Unable to create a 2D canvas context.");
      }

      this.initialized = false;
      this.initialize();

      return this;
    }

    setRenderer(name, renderer) {
      this.assertAlive();

      if (!renderer || typeof renderer !== "object") {
        throw new TypeError("A valid renderer instance is required.");
      }

      switch (name) {
        case "snake":
          this.snakeRenderer = renderer;
          break;

        case "grid":
          this.gridRenderer = renderer;
          break;

        case "effects":
          this.effectsRenderer = renderer;
          break;

        default:
          throw new Error("Unknown renderer: " + name);
      }

      return this;
    }

    setDimensions(width, height) {
      this.assertAlive();

      const nextWidth = Number(width);
      const nextHeight = Number(height);

      if (
        !Number.isFinite(nextWidth) ||
        !Number.isFinite(nextHeight) ||
        nextWidth <= 0 ||
        nextHeight <= 0
      ) {
        throw new RangeError("Canvas dimensions must be positive numbers.");
      }

      this.width = Math.floor(nextWidth);
      this.height = Math.floor(nextHeight);

      if (this.canvas) {
        this.canvas.style.width = this.width + "px";
        this.canvas.style.height = this.height + "px";

        this.canvas.width = Math.round(this.width * this.pixelRatio);
        this.canvas.height = Math.round(this.height * this.pixelRatio);
      }

      if (this.context) {
        this.context.setTransform(
          this.pixelRatio,
          0,
          0,
          this.pixelRatio,
          0,
          0
        );
      }

      this.emit("resized", {
        width: this.width,
        height: this.height,
        pixelRatio: this.pixelRatio
      });

      return {
        width: this.width,
        height: this.height
      };
    }

    resizeCanvas() {
      this.assertAlive();

      if (!this.canvas) {
        return false;
      }

      const rect = this.canvas.getBoundingClientRect
        ? this.canvas.getBoundingClientRect()
        : null;

      const parent = this.canvas.parentElement;

      const availableWidth =
        (rect && rect.width) ||
        (parent && parent.clientWidth) ||
        this.canvas.clientWidth ||
        this.canvas.width ||
        640;

      const availableHeight =
        (rect && rect.height) ||
        (parent && parent.clientHeight) ||
        this.canvas.clientHeight ||
        this.canvas.height ||
        480;

      this.pixelRatio = Math.max(
        1,
        Math.min(Number(global.devicePixelRatio) || 1, 3)
      );

      this.width = Math.max(1, Math.floor(availableWidth));
      this.height = Math.max(1, Math.floor(availableHeight));

      this.canvas.width = Math.round(this.width * this.pixelRatio);
      this.canvas.height = Math.round(this.height * this.pixelRatio);

      this.canvas.style.width = this.width + "px";
      this.canvas.style.height = this.height + "px";

      if (this.context) {
        this.context.setTransform(
          this.pixelRatio,
          0,
          0,
          this.pixelRatio,
          0,
          0
        );
      }

      this.emit("resized", {
        width: this.width,
        height: this.height,
        pixelRatio: this.pixelRatio
      });

      return true;
    }

    handleResize() {
      if (this.destroyed) {
        return;
      }

      this.resizeCanvas();
      this.requestRender();
    }

    setTheme(theme) {
      this.assertAlive();

      if (!theme || typeof theme !== "object") {
        return false;
      }

      if (typeof theme.backgroundColor === "string") {
        this.backgroundColor = theme.backgroundColor;
      }

      if (typeof theme.foregroundColor === "string") {
        this.foregroundColor = theme.foregroundColor;
      }

      if (typeof theme.gridColor === "string") {
        this.gridColor = theme.gridColor;
      }

      this.requestRender();
      return true;
    }

    setCellSize(size) {
      this.assertAlive();

      const nextSize = Number(size);

      if (!Number.isFinite(nextSize) || nextSize <= 0) {
        return false;
      }

      this.cellSize = nextSize;
      this.requestRender();

      return true;
    }

    updateState(nextState) {
      this.assertAlive();

      if (!nextState || typeof nextState !== "object") {
        return false;
      }

      Object.keys(this.state).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(nextState, key)) {
          this.state[key] = nextState[key];
        }
      });

      this.requestRender();

      return true;
    }

    getState() {
      this.assertAlive();

      return {
        width: this.width,
        height: this.height,
        pixelRatio: this.pixelRatio,
        cellSize: this.cellSize,
        initialized: this.initialized,
        rendering: this.rendering,
        frameCount: this.frameCount,
        lastFrameTime: this.lastFrameTime
      };
    }

    clear() {
      this.assertAlive();

      if (!this.context) {
        return false;
      }

      this.context.save();
      this.context.fillStyle = this.backgroundColor;
      this.context.fillRect(0, 0, this.width, this.height);
      this.context.restore();

      return true;
    }

    renderGrid() {
      if (!this.context) {
        return;
      }

      if (
        this.gridRenderer &&
        typeof this.gridRenderer.render === "function"
      ) {
        this.gridRenderer.render(this.context, {
          width: this.width,
          height: this.height,
          cellSize: this.cellSize,
          color: this.gridColor
        });

        return;
      }

      const context = this.context;
      const size = this.cellSize;

      context.save();
      context.strokeStyle = this.gridColor;
      context.lineWidth = 1;

      for (let x = 0; x <= this.width; x += size) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, this.height);
        context.stroke();
      }

      for (let y = 0; y <= this.height; y += size) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(this.width, y);
        context.stroke();
      }

      context.restore();
    }

    renderSnake() {
      if (!this.context || !this.state.snake) {
        return;
      }

      if (
        this.snakeRenderer &&
        typeof this.snakeRenderer.render === "function"
      ) {
        this.snakeRenderer.render(this.context, this.state.snake, {
          cellSize: this.cellSize,
          width: this.width,
          height: this.height,
          foregroundColor: this.foregroundColor
        });

        return;
      }

      const segments = Array.isArray(this.state.snake)
        ? this.state.snake
        : this.state.snake.segments;

      if (!Array.isArray(segments)) {
        return;
      }

      const context = this.context;

      context.save();
      context.fillStyle = this.foregroundColor;

      segments.forEach((segment, index) => {
        if (!segment) {
          return;
        }

        const x = Number(segment.x);
        const y = Number(segment.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        const padding = index === 0 ? 1 : 2;

        context.fillRect(
          x * this.cellSize + padding,
          y * this.cellSize + padding,
          Math.max(1, this.cellSize - padding * 2),
          Math.max(1, this.cellSize - padding * 2)
        );
      });

      context.restore();
    }

    renderFood() {
      if (!this.context || !this.state.food) {
        return;
      }

      const foods = Array.isArray(this.state.food)
        ? this.state.food
        : [this.state.food];

      const context = this.context;

      context.save();

      foods.forEach((food) => {
        if (!food) {
          return;
        }

        const x = Number(food.x);
        const y = Number(food.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        const color = food.color || "#ff5252";
        const inset = this.cellSize * 0.2;
        const centerX = x * this.cellSize + this.cellSize / 2;
        const centerY = y * this.cellSize + this.cellSize / 2;
        const radius = Math.max(2, this.cellSize * 0.3);

        context.fillStyle = color;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.fill();

        if (food.glow) {
          context.shadowColor = color;
          context.shadowBlur = this.cellSize * 0.6;
          context.beginPath();
          context.arc(
            centerX,
            centerY,
            radius + inset / 2,
            0,
            Math.PI * 2
          );
          context.fill();
          context.shadowBlur = 0;
        }
      });

      context.restore();
    }

    renderObstacles() {
      if (!this.context || !Array.isArray(this.state.obstacles)) {
        return;
      }

      const context = this.context;

      context.save();
      context.fillStyle = "#65717c";

      this.state.obstacles.forEach((obstacle) => {
        if (!obstacle) {
          return;
        }

        const x = Number(obstacle.x);
        const y = Number(obstacle.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        context.fillStyle = obstacle.color || "#65717c";

        context.fillRect(
          x * this.cellSize + 1,
          y * this.cellSize + 1,
          Math.max(1, this.cellSize - 2),
          Math.max(1, this.cellSize - 2)
        );
      });

      context.restore();
    }

    renderEffects(deltaTime) {
      if (!this.context) {
        return;
      }

      if (
        this.effectsRenderer &&
        typeof this.effectsRenderer.render === "function"
      ) {
        this.effectsRenderer.render(
          this.context,
          this.state.effects,
          {
            width: this.width,
            height: this.height,
            cellSize: this.cellSize,
            deltaTime
          }
        );
      }
    }

    renderHUD() {
      if (!this.context) {
        return;
      }

      const context = this.context;
      const score = Number(this.state.score) || 0;
      const level = Number(this.state.level) || 1;

      context.save();
      context.fillStyle = this.foregroundColor;
      context.font = "bold 14px monospace";
      context.textBaseline = "top";
      context.textAlign = "left";

      context.fillText("SCORE " + score, 10, 10);

      context.textAlign = "right";
      context.fillText("LEVEL " + level, this.width - 10, 10);

      context.restore();
    }

    renderStatusOverlay() {
      if (!this.context) {
        return;
      }

      let message = "";

      if (this.state.gameOver) {
        message = "GAME OVER";
      } else if (this.state.paused) {
        message = "PAUSED";
      }

      if (!message) {
        return;
      }

      const context = this.context;

      context.save();
      context.fillStyle = "rgba(0, 0, 0, 0.65)";
      context.fillRect(0, 0, this.width, this.height);

      context.fillStyle = this.foregroundColor;
      context.font = "bold 24px monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(message, this.width / 2, this.height / 2);

      context.restore();
    }

    renderFrame(timestamp) {
      this.assertAlive();

      if (!this.initialized || !this.context || this.rendering) {
        return false;
      }

      this.rendering = true;

      const now = Number(timestamp) || Date.now();
      const deltaTime = this.lastFrameTime > 0
        ? Math.max(0, now - this.lastFrameTime)
        : 0;

      try {
        this.clear();
        this.renderGrid();
        this.renderObstacles();
        this.renderFood();
        this.renderSnake();
        this.renderEffects(deltaTime);
        this.renderHUD();
        this.renderStatusOverlay();

        this.lastFrameTime = now;
        this.frameCount += 1;

        this.emit("frame-rendered", {
          timestamp: now,
          deltaTime,
          frameCount: this.frameCount
        });

        return true;
      } finally {
        this.rendering = false;
      }
    }

    render(timestamp) {
      return this.renderFrame(timestamp);
    }

    requestRender() {
      this.assertAlive();

      if (this.pendingFrame !== null) {
        return false;
      }

      const requestFrame = global.requestAnimationFrame ||
        function (callback) {
          return global.setTimeout(function () {
            callback(Date.now());
          }, 16);
        };

      this.pendingFrame = requestFrame.call(global, (timestamp) => {
        this.pendingFrame = null;

        if (!this.destroyed) {
          this.renderFrame(timestamp);
        }
      });

      return true;
    }

    cancelPendingRender() {
      if (this.pendingFrame === null) {
        return;
      }

      const cancelFrame = global.cancelAnimationFrame ||
        global.clearTimeout;

      cancelFrame.call(global, this.pendingFrame);
      this.pendingFrame = null;
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
            global.console.error("[SnakeRenderer]", error);
          }
        }
      });
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.cancelPendingRender();

      if (typeof global.removeEventListener === "function") {
        global.removeEventListener("resize", this.boundResize);
      }

      this.listeners.clear();
      this.initialized = false;
      this.destroyed = true;
      this.context = null;
      this.canvas = null;
    }
  }

  global.SnakeRenderer = SnakeRenderer;
})(window);