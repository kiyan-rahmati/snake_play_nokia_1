/**
 * Snake Nokia V2
 * Snake Movement Controller
 */

(function (window) {
  "use strict";

  const DIRECTIONS = Object.freeze({
    UP: Object.freeze({ x: 0, y: -1 }),
    DOWN: Object.freeze({ x: 0, y: 1 }),
    LEFT: Object.freeze({ x: -1, y: 0 }),
    RIGHT: Object.freeze({ x: 1, y: 0 })
  });

  const OPPOSITES = Object.freeze({
    UP: "DOWN",
    DOWN: "UP",
    LEFT: "RIGHT",
    RIGHT: "LEFT"
  });

  function isValidDirection(direction) {
    return Object.prototype.hasOwnProperty.call(
      DIRECTIONS,
      direction
    );
  }

  function create(snakeModel) {
    if (
      !snakeModel ||
      typeof snakeModel.setDirection !== "function" ||
      typeof snakeModel.move !== "function"
    ) {
      throw new TypeError("A valid snake model is required.");
    }

    let snake = null;
    let queuedDirection = null;
    let lastAppliedDirection = null;
    let movementEnabled = true;
    let moveCount = 0;

    function attach(snakeInstance) {
      if (
        !snakeInstance ||
        !Array.isArray(snakeInstance.segments) ||
        snakeInstance.segments.length === 0
      ) {
        throw new TypeError("A valid snake instance is required.");
      }

      snake = snakeInstance;
      queuedDirection = null;
      lastAppliedDirection = snake.direction;
      movementEnabled = true;
      moveCount = 0;

      return getState();
    }

    function requestDirection(direction) {
      if (!snake || !snake.alive || !movementEnabled) {
        return false;
      }

      if (!isValidDirection(direction)) {
        return false;
      }

      const currentDirection =
        queuedDirection || snake.nextDirection || snake.direction;

      if (direction === OPPOSITES[currentDirection]) {
        return false;
      }

      if (direction === currentDirection) {
        return true;
      }

      queuedDirection = direction;

      return true;
    }

    function applyQueuedDirection() {
      if (!snake || !queuedDirection) {
        return false;
      }

      const direction = queuedDirection;
      queuedDirection = null;

      const accepted = snakeModel.setDirection(snake, direction);

      if (accepted) {
        lastAppliedDirection = direction;
      }

      return accepted;
    }

    function step(options = {}) {
      if (!snake || !snake.alive || !movementEnabled) {
        return null;
      }

      applyQueuedDirection();

      const previousHead = snakeModel.getHead(snake);
      const nextHead = snakeModel.move(snake, options);

      if (!nextHead) {
        return null;
      }

      moveCount += 1;

      return Object.freeze({
        previousHead,
        head: { ...nextHead },
        direction: snake.direction,
        moveCount,
        length: snakeModel.getLength(snake)
      });
    }

    function setEnabled(enabled) {
      movementEnabled = Boolean(enabled);

      if (!movementEnabled) {
        queuedDirection = null;
      }

      return movementEnabled;
    }

    function reverse() {
      if (!snake || !snake.alive) {
        return false;
      }

      const reverseDirection = OPPOSITES[snake.direction];

      if (!reverseDirection) {
        return false;
      }

      const currentHead = snakeModel.getHead(snake);
      const reversedSegments = snakeModel.getSegments(snake).reverse();

      snake.segments = reversedSegments;
      snake.direction = reverseDirection;
      snake.nextDirection = reverseDirection;

      queuedDirection = null;
      lastAppliedDirection = reverseDirection;

      return Boolean(currentHead);
    }

    function resetQueue() {
      queuedDirection = null;

      if (snake) {
        lastAppliedDirection = snake.direction;
      }
    }

    function getState() {
      return Object.freeze({
        attached: Boolean(snake),
        enabled: movementEnabled,
        direction: snake ? snake.direction : null,
        queuedDirection,
        lastAppliedDirection,
        moveCount,
        alive: snake ? snake.alive : false
      });
    }

    function detach() {
      snake = null;
      queuedDirection = null;
      lastAppliedDirection = null;
      movementEnabled = false;
      moveCount = 0;
    }

    return Object.freeze({
      attach,
      requestDirection,
      step,
      setEnabled,
      reverse,
      resetQueue,
      getState,
      detach
    });
  }

  window.SnakeMovement = Object.freeze({
    create,
    DIRECTIONS,
    OPPOSITES,
    isValidDirection
  });
})(window);