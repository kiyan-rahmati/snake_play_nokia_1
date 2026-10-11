/**
 * Snake Nokia V2
 * Snake Renderer
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    cellSize: 20,
    headColor: "#b7f34a",
    bodyColor: "#76b82a",
    outlineColor: "#25420f",
    eyeColor: "#14200b",
    cornerRadius: 3,
    showEyes: true,
    showOutline: true,
    bodyInset: 1
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    let canvas = null;
    let context = null;
    let lastSegments = [];

    function attach(target) {
      if (!target || typeof target.getContext !== "function") {
        throw new TypeError("A valid canvas element is required.");
      }

      const ctx = target.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas 2D context is unavailable.");
      }

      canvas = target;
      context = ctx;

      return true;
    }

    function resolveCellSize(board) {
      if (board && Number.isFinite(board.cellSize) && board.cellSize > 0) {
        return board.cellSize;
      }

      return settings.cellSize;
    }

    function drawRoundedRect(ctx, x, y, width, height, radius) {
      const r = Math.max(
        0,
        Math.min(radius, width / 2, height / 2)
      );

      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - r,
        y + height
      );
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    }

    function drawSegment(segment, index, segments, cellSize) {
      const ctx = context;
      const inset = Math.max(0, settings.bodyInset);
      const x = segment.x * cellSize + inset;
      const y = segment.y * cellSize + inset;
      const size = Math.max(1, cellSize - inset * 2);
      const isHead = index === 0;

      ctx.save();

      if (settings.showOutline) {
        ctx.fillStyle = settings.outlineColor;
        drawRoundedRect(
          ctx,
          x - 1,
          y - 1,
          size + 2,
          size + 2,
          settings.cornerRadius + 1
        );
      }

      ctx.fillStyle = isHead
        ? settings.headColor
        : settings.bodyColor;

      drawRoundedRect(
        ctx,
        x,
        y,
        size,
        size,
        settings.cornerRadius
      );

      if (!isHead && index > 0 && index < segments.length - 1) {
        drawBodyHighlight(segment, cellSize, inset);
      }

      if (isHead && settings.showEyes) {
        drawEyes(segment, cellSize);
      }

      ctx.restore();
    }

    function drawBodyHighlight(segment, cellSize, inset) {
      const ctx = context;
      const highlightSize = Math.max(1, cellSize * 0.12);

      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.fillRect(
        segment.x * cellSize + inset + 2,
        segment.y * cellSize + inset + 2,
        highlightSize,
        highlightSize
      );
    }

    function drawEyes(head, cellSize) {
      const ctx = context;
      const direction = lastDirection || "RIGHT";
      const eyeSize = Math.max(2, cellSize * 0.13);
      const offset = cellSize * 0.28;

      let firstEye;
      let secondEye;

      switch (direction) {
        case "UP":
          firstEye = { x: 0.32, y: 0.25 };
          secondEye = { x: 0.68, y: 0.25 };
          break;

        case "DOWN":
          firstEye = { x: 0.32, y: 0.75 };
          secondEye = { x: 0.68, y: 0.75 };
          break;

        case "LEFT":
          firstEye = { x: 0.25, y: 0.32 };
          secondEye = { x: 0.25, y: 0.68 };
          break;

        default:
          firstEye = { x: 0.75, y: 0.32 };
          secondEye = { x: 0.75, y: 0.68 };
      }

      ctx.fillStyle = settings.eyeColor;

      [firstEye, secondEye].forEach(function (eye) {
        ctx.beginPath();
        ctx.arc(
          head.x * cellSize + cellSize * eye.x,
          head.y * cellSize + cellSize * eye.y,
          eyeSize,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    }

    let lastDirection = "RIGHT";

    function render(snake, board = {}) {
      if (!context || !canvas) {
        return false;
      }

      const segments = Array.isArray(snake)
        ? snake
        : snake && Array.isArray(snake.segments)
          ? snake.segments
          : [];

      if (segments.length === 0) {
        lastSegments = [];
        return true;
      }

      if (snake && !Array.isArray(snake) && snake.direction) {
        lastDirection = snake.direction;
      }

      const cellSize = resolveCellSize(board);

      context.save();

      segments.forEach(function (segment, index) {
        if (
          !segment ||
          !Number.isFinite(segment.x) ||
          !Number.isFinite(segment.y)
        ) {
          return;
        }

        drawSegment(segment, index, segments, cellSize);
      });

      context.restore();

      lastSegments = segments.map(function (segment) {
        return { x: segment.x, y: segment.y };
      });

      return true;
    }

    function clear(board = {}) {
      if (!context || !canvas) {
        return false;
      }

      const cellSize = resolveCellSize(board);
      const width = Number.isFinite(board.width)
        ? board.width * cellSize
        : canvas.width;
      const height = Number.isFinite(board.height)
        ? board.height * cellSize
        : canvas.height;

      context.clearRect(0, 0, width, height);
      lastSegments = [];

      return true;
    }

    function destroy() {
      canvas = null;
      context = null;
      lastSegments = [];
      lastDirection = "RIGHT";
    }

    function getState() {
      return Object.freeze({
        attached: Boolean(canvas && context),
        segmentCount: lastSegments.length,
        direction: lastDirection,
        cellSize: settings.cellSize
      });
    }

    return Object.freeze({
      attach,
      render,
      clear,
      destroy,
      getState
    });
  }

  window.SnakeRenderer = Object.freeze({
    create
  });
})(window);