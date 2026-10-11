/**
 * Snake Nokia V2
 * Snake Model
 */

(function (window) {
  "use strict";

  const DEFAULT_CONFIG = Object.freeze({
    startLength: 3,
    startX: 10,
    startY: 10,
    initialDirection: "RIGHT",
    cellSize: 20
  });

  const DIRECTIONS = Object.freeze({
    UP: Object.freeze({ x: 0, y: -1 }),
    DOWN: Object.freeze({ x: 0, y: 1 }),
    LEFT: Object.freeze({ x: -1, y: 0 }),
    RIGHT: Object.freeze({ x: 1, y: 0 })
  });

  const OPPOSITE_DIRECTIONS = Object.freeze({
    UP: "DOWN",
    DOWN: "UP",
    LEFT: "RIGHT",
    RIGHT: "LEFT"
  });

  function createSegment(x, y) {
    return { x, y };
  }

  function cloneSegments(segments) {
    return segments.map(function (segment) {
      return createSegment(segment.x, segment.y);
    });
  }

  function validateDirection(direction) {
    if (!Object.prototype.hasOwnProperty.call(DIRECTIONS, direction)) {
      throw new TypeError(`Invalid snake direction: ${direction}`);
    }

    return direction;
  }

  function create(config = {}) {
    const settings = {
      ...DEFAULT_CONFIG,
      ...config
    };

    if (
      !Number.isInteger(settings.startLength) ||
      settings.startLength < 1
    ) {
      throw new RangeError("Snake length must be a positive integer.");
    }

    if (
      !Number.isInteger(settings.startX) ||
      !Number.isInteger(settings.startY)
    ) {
      throw new TypeError("Snake starting coordinates must be integers.");
    }

    const direction = validateDirection(settings.initialDirection);
    const movement = DIRECTIONS[direction];

    const segments = [];

    for (let index = 0; index < settings.startLength; index += 1) {
      segments.push(
        createSegment(
          settings.startX - movement.x * index,
          settings.startY - movement.y * index
        )
      );
    }

    return {
      segments,
      direction,
      nextDirection: direction,
      pendingGrowth: 0,
      alive: true,
      distanceTravelled: 0
    };
  }

  function getHead(snake) {
    if (!snake || !Array.isArray(snake.segments)) {
      return null;
    }

    return snake.segments.length > 0
      ? { ...snake.segments[0] }
      : null;
  }

  function getTail(snake) {
    if (!snake || !Array.isArray(snake.segments)) {
      return null;
    }

    const tail = snake.segments[snake.segments.length - 1];

    return tail ? { ...tail } : null;
  }

  function getSegments(snake) {
    if (!snake || !Array.isArray(snake.segments)) {
      return [];
    }

    return cloneSegments(snake.segments);
  }

  function getLength(snake) {
    return snake && Array.isArray(snake.segments)
      ? snake.segments.length
      : 0;
  }

  function setDirection(snake, direction) {
    if (!snake || snake.alive !== true) {
      return false;
    }

    const nextDirection = validateDirection(direction);
    const currentDirection = snake.direction;

    if (
      nextDirection === OPPOSITE_DIRECTIONS[currentDirection]
    ) {
      return false;
    }

    snake.nextDirection = nextDirection;

    return true;
  }

  function applyDirection(snake) {
    if (!snake || snake.alive !== true) {
      return false;
    }

    const nextDirection = validateDirection(snake.nextDirection);

    if (
      nextDirection === OPPOSITE_DIRECTIONS[snake.direction]
    ) {
      return false;
    }

    snake.direction = nextDirection;

    return true;
  }

  function move(snake, options = {}) {
    if (
      !snake ||
      snake.alive !== true ||
      !Array.isArray(snake.segments) ||
      snake.segments.length === 0
    ) {
      return null;
    }

    applyDirection(snake);

    const movement = DIRECTIONS[snake.direction];
    const head = snake.segments[0];

    const nextHead = createSegment(
      head.x + movement.x,
      head.y + movement.y
    );

    snake.segments.unshift(nextHead);

    if (snake.pendingGrowth > 0) {
      snake.pendingGrowth -= 1;
    } else if (options.grow !== true) {
      snake.segments.pop();
    }

    snake.distanceTravelled += 1;

    return { ...nextHead };
  }

  function grow(snake, amount = 1) {
    if (!snake || snake.alive !== true) {
      return false;
    }

    if (!Number.isInteger(amount) || amount < 1) {
      throw new RangeError("Growth amount must be a positive integer.");
    }

    snake.pendingGrowth += amount;

    return true;
  }

  function contains(snake, position, options = {}) {
    if (
      !snake ||
      !Array.isArray(snake.segments) ||
      !position ||
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y)
    ) {
      return false;
    }

    const startIndex = options.excludeHead === true ? 1 : 0;

    return snake.segments
      .slice(startIndex)
      .some(function (segment) {
        return segment.x === position.x &&
          segment.y === position.y;
      });
  }

  function occupies(snake, x, y) {
    return contains(snake, { x, y });
  }

  function kill(snake) {
    if (!snake) {
      return false;
    }

    if (!snake.alive) {
      return false;
    }

    snake.alive = false;

    return true;
  }

  function reset(snake, config = {}) {
    if (!snake) {
      throw new TypeError("A snake instance is required.");
    }

    const freshSnake = create(config);

    snake.segments = freshSnake.segments;
    snake.direction = freshSnake.direction;
    snake.nextDirection = freshSnake.nextDirection;
    snake.pendingGrowth = freshSnake.pendingGrowth;
    snake.alive = freshSnake.alive;
    snake.distanceTravelled = freshSnake.distanceTravelled;

    return snake;
  }

  function getSnapshot(snake) {
    if (!snake) {
      return null;
    }

    return Object.freeze({
      segments: cloneSegments(snake.segments).map(function (segment) {
        return Object.freeze(segment);
      }),
      head: getHead(snake),
      tail: getTail(snake),
      length: getLength(snake),
      direction: snake.direction,
      nextDirection: snake.nextDirection,
      pendingGrowth: snake.pendingGrowth,
      alive: snake.alive,
      distanceTravelled: snake.distanceTravelled
    });
  }

  window.SnakeModel = Object.freeze({
    create,
    getHead,
    getTail,
    getSegments,
    getLength,
    setDirection,
    applyDirection,
    move,
    grow,
    contains,
    occupies,
    kill,
    reset,
    getSnapshot,
    DIRECTIONS,
    OPPOSITE_DIRECTIONS
  });
})(window);