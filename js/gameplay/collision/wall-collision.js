/**
 * Snake Nokia V2
 * Wall Collision Handler
 */

(function (window) {
  "use strict";

  function create(options = {}) {
    const settings = {
      mode: "classic",
      onCollision: null,
      ...options
    };

    let board = {
      width: 20,
      height: 20
    };

    let collisionCount = 0;
    let lastCollision = null;

    function configureBoard(width, height) {
      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 1 ||
        height < 1
      ) {
        throw new RangeError(
          "Board dimensions must be positive integers."
        );
      }

      board = { width, height };

      return getBoard();
    }

    function setMode(mode) {
      const supportedModes = ["classic", "wrap-around"];

      if (!supportedModes.includes(mode)) {
        throw new TypeError(`Unsupported movement mode: ${mode}`);
      }

      settings.mode = mode;

      return settings.mode;
    }

    function check(position, mode = settings.mode) {
      if (
        !position ||
        !Number.isInteger(position.x) ||
        !Number.isInteger(position.y)
      ) {
        return Object.freeze({
          collided: false,
          validPosition: false,
          wrapped: false,
          position: null,
          collision: null
        });
      }

      const outside =
        position.x < 0 ||
        position.y < 0 ||
        position.x >= board.width ||
        position.y >= board.height;

      if (!outside) {
        return Object.freeze({
          collided: false,
          validPosition: true,
          wrapped: false,
          position: { ...position },
          collision: null
        });
      }

      if (mode === "wrap-around") {
        const wrappedPosition = {
          x: ((position.x % board.width) + board.width) % board.width,
          y: ((position.y % board.height) + board.height) % board.height
        };

        return Object.freeze({
          collided: false,
          validPosition: true,
          wrapped: true,
          position: wrappedPosition,
          collision: null
        });
      }

      if (mode !== "classic") {
        throw new TypeError(`Unsupported movement mode: ${mode}`);
      }

      const collision = Object.freeze({
        type: "wall",
        position: { ...position },
        board: { ...board },
        fatal: true,
        timestamp: Date.now()
      });

      collisionCount += 1;
      lastCollision = collision;

      if (typeof settings.onCollision === "function") {
        settings.onCollision(collision);
      }

      return Object.freeze({
        collided: true,
        validPosition: true,
        wrapped: false,
        position: { ...position },
        collision
      });
    }

    function isInside(position) {
      return Boolean(
        position &&
        Number.isInteger(position.x) &&
        Number.isInteger(position.y) &&
        position.x >= 0 &&
        position.y >= 0 &&
        position.x < board.width &&
        position.y < board.height
      );
    }

    function wrapPosition(position) {
      if (
        !position ||
        !Number.isInteger(position.x) ||
        !Number.isInteger(position.y)
      ) {
        return null;
      }

      return {
        x: ((position.x % board.width) + board.width) % board.width,
        y: ((position.y % board.height) + board.height) % board.height
      };
    }

    function getBoard() {
      return Object.freeze({
        width: board.width,
        height: board.height
      });
    }

    function getLastCollision() {
      return lastCollision;
    }

    function getStatistics() {
      return Object.freeze({
        collisionCount,
        lastCollision
      });
    }

    function resetStatistics() {
      collisionCount = 0;
      lastCollision = null;
    }

    return Object.freeze({
      configureBoard,
      setMode,
      check,
      isInside,
      wrapPosition,
      getBoard,
      getLastCollision,
      getStatistics,
      resetStatistics
    });
  }

  window.SnakeWallCollision = Object.freeze({
    create
  });
})(window);