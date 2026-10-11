(function (global) {
  "use strict";

  class SnakeGridRenderer {
    constructor(options) {
      const settings = options || {};

      this.cellSize = Math.max(1, Number(settings.cellSize) || 20);
      this.lineColor = settings.lineColor || "rgba(215,247,194,0.08)";
      this.lineWidth = Math.max(0, Number(settings.lineWidth) || 1);
      this.showGrid = settings.showGrid !== false;
      this.showCoordinates = settings.showCoordinates === true;
      this.coordinateColor = settings.coordinateColor || "rgba(215,247,194,0.35)";
      this.coordinateFont = settings.coordinateFont || "10px monospace";
      this.offsetX = Number(settings.offsetX) || 0;
      this.offsetY = Number(settings.offsetY) || 0;
      this.width = 0;
      this.height = 0;
      this.destroyed = false;
      this.listeners = new Map();
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeGridRenderer has been destroyed.");
      }
    }

    setCellSize(size) {
      this.assertAlive();

      const value = Number(size);

      if (!Number.isFinite(value) || value <= 0) {
        return false;
      }

      this.cellSize = value;
      this.emit("configuration-changed", {
        cellSize: this.cellSize
      });

      return true;
    }

    setGridVisible(visible) {
      this.assertAlive();
      this.showGrid = Boolean(visible);

      this.emit("configuration-changed", {
        showGrid: this.showGrid
      });

      return this.showGrid;
    }

    setCoordinatesVisible(visible) {
      this.assertAlive();
      this.showCoordinates = Boolean(visible);

      this.emit("configuration-changed", {
        showCoordinates: this.showCoordinates
      });

      return this.showCoordinates;
    }

    setColors(options) {
      this.assertAlive();

      if (!options || typeof options !== "object") {
        return false;
      }

      if (typeof options.lineColor === "string") {
        this.lineColor = options.lineColor;
      }

      if (typeof options.coordinateColor === "string") {
        this.coordinateColor = options.coordinateColor;
      }

      if (typeof options.coordinateFont === "string") {
        this.coordinateFont = options.coordinateFont;
      }

      if (Number.isFinite(Number(options.lineWidth))) {
        this.lineWidth = Math.max(0, Number(options.lineWidth));
      }

      this.emit("configuration-changed", {
        lineColor: this.lineColor,
        coordinateColor: this.coordinateColor,
        lineWidth: this.lineWidth
      });

      return true;
    }

    setOffset(x, y) {
      this.assertAlive();

      const offsetX = Number(x);
      const offsetY = Number(y);

      if (!Number.isFinite(offsetX) || !Number.isFinite(offsetY)) {
        return false;
      }

      this.offsetX = offsetX;
      this.offsetY = offsetY;

      return true;
    }

    calculateDimensions(width, height) {
      this.assertAlive();

      const canvasWidth = Number(width);
      const canvasHeight = Number(height);

      if (
        !Number.isFinite(canvasWidth) ||
        !Number.isFinite(canvasHeight) ||
        canvasWidth < 0 ||
        canvasHeight < 0
      ) {
        throw new RangeError("Canvas dimensions must be non-negative.");
      }

      this.width = canvasWidth;
      this.height = canvasHeight;

      return {
        width: this.width,
        height: this.height,
        columns: Math.ceil(this.width / this.cellSize),
        rows: Math.ceil(this.height / this.cellSize),
        cellSize: this.cellSize
      };
    }

    render(context, options) {
      this.assertAlive();

      if (!context) {
        return false;
      }

      const settings = options || {};
      const width = Number(settings.width);
      const height = Number(settings.height);

      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width < 0 ||
        height < 0
      ) {
        return false;
      }

      this.calculateDimensions(width, height);

      if (settings.cellSize !== undefined) {
        const size = Number(settings.cellSize);

        if (Number.isFinite(size) && size > 0) {
          this.cellSize = size;
        }
      }

      if (typeof settings.color === "string") {
        this.lineColor = settings.color;
      }

      context.save();

      try {
        if (this.showGrid && this.lineWidth > 0) {
          this.drawGrid(context);
        }

        if (this.showCoordinates) {
          this.drawCoordinates(context);
        }
      } finally {
        context.restore();
      }

      this.emit("rendered", {
        width: this.width,
        height: this.height,
        columns: Math.ceil(this.width / this.cellSize),
        rows: Math.ceil(this.height / this.cellSize)
      });

      return true;
    }

    drawGrid(context) {
      const size = this.cellSize;

      context.save();
      context.strokeStyle = this.lineColor;
      context.lineWidth = this.lineWidth;
      context.beginPath();

      const startX = this.offsetX % size;
      const startY = this.offsetY % size;

      for (
        let x = startX < 0 ? startX + size : startX;
        x <= this.width;
        x += size
      ) {
        context.moveTo(Math.round(x) + 0.5, 0);
        context.lineTo(Math.round(x) + 0.5, this.height);
      }

      for (
        let y = startY < 0 ? startY + size : startY;
        y <= this.height;
        y += size
      ) {
        context.moveTo(0, Math.round(y) + 0.5);
        context.lineTo(this.width, Math.round(y) + 0.5);
      }

      context.stroke();
      context.restore();
    }

    drawCoordinates(context) {
      const columns = Math.ceil(this.width / this.cellSize);
      const rows = Math.ceil(this.height / this.cellSize);

      context.save();
      context.fillStyle = this.coordinateColor;
      context.font = this.coordinateFont;
      context.textAlign = "center";
      context.textBaseline = "middle";

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = column * this.cellSize + this.cellSize / 2;
          const y = row * this.cellSize + this.cellSize / 2;

          if (
            x < 0 ||
            y < 0 ||
            x > this.width ||
            y > this.height
          ) {
            continue;
          }

          context.fillText(
            column + "," + row,
            x,
            y,
            this.cellSize
          );
        }
      }

      context.restore();
    }

    getCellAtPixel(x, y) {
      this.assertAlive();

      const pixelX = Number(x) - this.offsetX;
      const pixelY = Number(y) - this.offsetY;

      if (!Number.isFinite(pixelX) || !Number.isFinite(pixelY)) {
        return null;
      }

      return {
        x: Math.floor(pixelX / this.cellSize),
        y: Math.floor(pixelY / this.cellSize)
      };
    }

    getCellCenter(column, row) {
      this.assertAlive();

      const x = Number(column);
      const y = Number(row);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }

      return {
        x: this.offsetX + x * this.cellSize + this.cellSize / 2,
        y: this.offsetY + y * this.cellSize + this.cellSize / 2
      };
    }

    getCellBounds(column, row) {
      this.assertAlive();

      const x = Number(column);
      const y = Number(row);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }

      return {
        x: this.offsetX + x * this.cellSize,
        y: this.offsetY + y * this.cellSize,
        width: this.cellSize,
        height: this.cellSize
      };
    }

    getGridInfo() {
      this.assertAlive();

      return {
        width: this.width,
        height: this.height,
        cellSize: this.cellSize,
        columns: Math.ceil(this.width / this.cellSize),
        rows: Math.ceil(this.height / this.cellSize),
        showGrid: this.showGrid,
        showCoordinates: this.showCoordinates,
        offsetX: this.offsetX,
        offsetY: this.offsetY
      };
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
            global.console.error("[SnakeGridRenderer]", error);
          }
        }
      });
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeGridRenderer = SnakeGridRenderer;
})(window);