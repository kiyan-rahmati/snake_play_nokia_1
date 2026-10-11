(function (global) {
  "use strict";

  class SnakeCanvasRenderer {
    constructor(options) {
      const settings = options || {};

      this.canvas = null;
      this.context = null;
      this.container = settings.container || null;

      this.width = 0;
      this.height = 0;
      this.pixelRatio = 1;

      this.backgroundColor = settings.backgroundColor || "#101820";
      this.foregroundColor = settings.foregroundColor || "#d7f7c2";
      this.gridColor = settings.gridColor || "rgba(215,247,194,0.08)";

      this.smoothing = settings.smoothing === true;
      this.autoResize = settings.autoResize !== false;
      this.destroyed = false;
      this.initialized = false;

      this.listeners = new Map();
      this.boundResize = this.handleResize.bind(this);

      if (settings.canvas) {
        this.attach(settings.canvas);
      }
    }

    attach(canvas) {
      this.assertAlive();

      if (!canvas || typeof canvas.getContext !== "function") {
        throw new TypeError("A valid canvas element is required.");
      }

      this.detach();

      this.canvas = canvas;
      this.context = canvas.getContext("2d", {
        alpha: false,
        desynchronized: true
      });

      if (!this.context) {
        throw new Error("Unable to initialize the canvas context.");
      }

      this.context.imageSmoothingEnabled = this.smoothing;

      if (this.autoResize && typeof global.addEventListener === "function") {
        global.addEventListener("resize", this.boundResize);
      }

      this.initialized = true;
      this.resize();

      this.emit("attached", {
        canvas: this.canvas,
        width: this.width,
        height: this.height
      });

      return this;
    }

    detach() {
      if (
        this.autoResize &&
        typeof global.removeEventListener === "function"
      ) {
        global.removeEventListener("resize", this.boundResize);
      }

      this.canvas = null;
      this.context = null;
      this.initialized = false;

      return this;
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeCanvasRenderer has been destroyed.");
      }
    }

    resize(width, height) {
      this.assertAlive();

      if (!this.canvas || !this.context) {
        return false;
      }

      let nextWidth = Number(width);
      let nextHeight = Number(height);

      if (!Number.isFinite(nextWidth) || nextWidth <= 0) {
        const rect = this.canvas.getBoundingClientRect
          ? this.canvas.getBoundingClientRect()
          : null;

        nextWidth =
          (rect && rect.width) ||
          (this.container && this.container.clientWidth) ||
          this.canvas.clientWidth ||
          640;
      }

      if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
        const rect = this.canvas.getBoundingClientRect
          ? this.canvas.getBoundingClientRect()
          : null;

        nextHeight =
          (rect && rect.height) ||
          (this.container && this.container.clientHeight) ||
          this.canvas.clientHeight ||
          480;
      }

      this.width = Math.max(1, Math.floor(nextWidth));
      this.height = Math.max(1, Math.floor(nextHeight));

      this.pixelRatio = Math.max(
        1,
        Math.min(Number(global.devicePixelRatio) || 1, 3)
      );

      this.canvas.width = Math.round(this.width * this.pixelRatio);
      this.canvas.height = Math.round(this.height * this.pixelRatio);

      if (this.canvas.style) {
        this.canvas.style.width = this.width + "px";
        this.canvas.style.height = this.height + "px";
      }

      this.context.setTransform(
        this.pixelRatio,
        0,
        0,
        this.pixelRatio,
        0,
        0
      );

      this.context.imageSmoothingEnabled = this.smoothing;

      this.emit("resized", {
        width: this.width,
        height: this.height,
        pixelRatio: this.pixelRatio
      });

      return true;
    }

    handleResize() {
      if (this.destroyed || !this.initialized) {
        return;
      }

      this.resize();
    }

    clear(color) {
      this.assertAlive();

      if (!this.context) {
        return false;
      }

      const context = this.context;

      context.save();
      context.setTransform(
        this.pixelRatio,
        0,
        0,
        this.pixelRatio,
        0,
        0
      );

      context.fillStyle =
        typeof color === "string"
          ? color
          : this.backgroundColor;

      context.fillRect(0, 0, this.width, this.height);
      context.restore();

      return true;
    }

    setBackgroundColor(color) {
      this.assertAlive();

      if (typeof color !== "string" || !color.trim()) {
        return false;
      }

      this.backgroundColor = color;
      return true;
    }

    setForegroundColor(color) {
      this.assertAlive();

      if (typeof color !== "string" || !color.trim()) {
        return false;
      }

      this.foregroundColor = color;
      return true;
    }

    setGridColor(color) {
      this.assertAlive();

      if (typeof color !== "string" || !color.trim()) {
        return false;
      }

      this.gridColor = color;
      return true;
    }

    setSmoothing(enabled) {
      this.assertAlive();

      this.smoothing = Boolean(enabled);

      if (this.context) {
        this.context.imageSmoothingEnabled = this.smoothing;
      }

      return this.smoothing;
    }

    getContext() {
      this.assertAlive();
      return this.context;
    }

    getCanvas() {
      this.assertAlive();
      return this.canvas;
    }

    getDimensions() {
      this.assertAlive();

      return {
        width: this.width,
        height: this.height,
        pixelRatio: this.pixelRatio
      };
    }

    getCellDimensions(columns, rows) {
      this.assertAlive();

      const columnCount = Math.floor(Number(columns));
      const rowCount = Math.floor(Number(rows));

      if (
        !Number.isFinite(columnCount) ||
        !Number.isFinite(rowCount) ||
        columnCount <= 0 ||
        rowCount <= 0
      ) {
        throw new RangeError("Grid dimensions must be positive integers.");
      }

      return {
        width: this.width / columnCount,
        height: this.height / rowCount,
        columns: columnCount,
        rows: rowCount
      };
    }

    beginFrame() {
      this.assertAlive();

      if (!this.context) {
        return false;
      }

      this.context.save();
      this.context.setTransform(
        this.pixelRatio,
        0,
        0,
        this.pixelRatio,
        0,
        0
      );

      return true;
    }

    endFrame() {
      this.assertAlive();

      if (!this.context) {
        return false;
      }

      this.context.restore();
      this.emit("frame-complete", {
        width: this.width,
        height: this.height
      });

      return true;
    }

    drawRect(x, y, width, height, color) {
      this.assertAlive();

      if (!this.context) {
        return false;
      }

      const values = [x, y, width, height].map(Number);

      if (
        values.some((value) => !Number.isFinite(value)) ||
        values[2] < 0 ||
        values[3] < 0
      ) {
        return false;
      }

      this.context.save();
      this.context.fillStyle =
        typeof color === "string"
          ? color
          : this.foregroundColor;

      this.context.fillRect(
        values[0],
        values[1],
        values[2],
        values[3]
      );

      this.context.restore();

      return true;
    }

    drawCircle(x, y, radius, color) {
      this.assertAlive();

      if (!this.context) {
        return false;
      }

      const centerX = Number(x);
      const centerY = Number(y);
      const circleRadius = Number(radius);

      if (
        !Number.isFinite(centerX) ||
        !Number.isFinite(centerY) ||
        !Number.isFinite(circleRadius) ||
        circleRadius < 0
      ) {
        return false;
      }

      this.context.save();
      this.context.fillStyle =
        typeof color === "string"
          ? color
          : this.foregroundColor;

      this.context.beginPath();
      this.context.arc(
        centerX,
        centerY,
        circleRadius,
        0,
        Math.PI * 2
      );
      this.context.fill();
      this.context.restore();

      return true;
    }

    drawText(text, x, y, options) {
      this.assertAlive();

      if (!this.context) {
        return false;
      }

      const settings = options || {};
      const positionX = Number(x);
      const positionY = Number(y);

      if (
        !Number.isFinite(positionX) ||
        !Number.isFinite(positionY)
      ) {
        return false;
      }

      const context = this.context;

      context.save();
      context.fillStyle = settings.color || this.foregroundColor;
      context.font = settings.font || "14px monospace";
      context.textAlign = settings.align || "left";
      context.textBaseline = settings.baseline || "alphabetic";

      if (settings.maxWidth) {
        context.fillText(
          String(text),
          positionX,
          positionY,
          Number(settings.maxWidth)
        );
      } else {
        context.fillText(
          String(text),
          positionX,
          positionY
        );
      }

      context.restore();

      return true;
    }

    drawImage(image, x, y, width, height) {
      this.assertAlive();

      if (!this.context || !image) {
        return false;
      }

      const positionX = Number(x);
      const positionY = Number(y);
      const targetWidth = Number(width);
      const targetHeight = Number(height);

      if (
        !Number.isFinite(positionX) ||
        !Number.isFinite(positionY)
      ) {
        return false;
      }

      this.context.save();

      if (
        Number.isFinite(targetWidth) &&
        Number.isFinite(targetHeight) &&
        targetWidth >= 0 &&
        targetHeight >= 0
      ) {
        this.context.drawImage(
          image,
          positionX,
          positionY,
          targetWidth,
          targetHeight
        );
      } else {
        this.context.drawImage(image, positionX, positionY);
      }

      this.context.restore();

      return true;
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
            global.console.error("[SnakeCanvasRenderer]", error);
          }
        }
      });
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.detach();
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeCanvasRenderer = SnakeCanvasRenderer;
})(window);