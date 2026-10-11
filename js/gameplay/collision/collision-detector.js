/**
 * Snake Nokia V2
 * Collision Detector
 */

(function (window) {
  "use strict";

  const COLLISION_TYPES = Object.freeze({
    WALL: "wall",
    SELF: "self",
    OBSTACLE: "obstacle",
    FOOD: "food",
    NONE: "none"
  });

  function create(options = {}) {
    const settings = {
      wallCollisionEnabled: true,
      selfCollisionEnabled: true,
      obstacleCollisionEnabled: true,
      foodCollisionEnabled: true,
      ...options
    };

    let checksPerformed = 0;
    let collisionsDetected = 0;
    let lastCollision = null;

    function isValidPosition(position) {
      return Boolean(
        position &&
        Number.isInteger(position.x) &&
        Number.isInteger(position.y)
      );
    }

    function samePosition(a, b) {
      return a.x === b.x && a.y === b.y;
    }

    function checkWall(position, board, mode = "classic") {
      if (!settings.wallCollisionEnabled) {
        return null;
      }

      if (!isValidPosition(position) || !board) {
        return null;
      }

      if (
        !Number.isInteger(board.width) ||
        !Number.isInteger(board.height) ||
        board.width < 1 ||
        board.height < 1
      ) {
        return null;
      }

      if (mode === "wrap-around") {
        return null;
      }

      const outside =
        position.x < 0 ||
        position.y < 0 ||
        position.x >= board.width ||
        position.y >= board.height;

      if (!outside) {
        return null;
      }

      return {
        type: COLLISION_TYPES.WALL,
        position: { ...position },
        fatal: true,
        details: {
          boardWidth: board.width,
          boardHeight: board.height
        }
      };
    }

    function checkSelf(position, segments, options = {}) {
      if (!settings.selfCollisionEnabled) {
        return null;
      }

      if (!isValidPosition(position) || !Array.isArray(segments)) {
        return null;
      }

      const startIndex = options.excludeHead === false ? 0 : 1;
      const body = segments.slice(startIndex);

      const index = body.findIndex(function (segment) {
        return isValidPosition(segment) && samePosition(position, segment);
      });

      if (index === -1) {
        return null;
      }

      return {
        type: COLLISION_TYPES.SELF,
        position: { ...position },
        fatal: true,
        details: {
          segmentIndex: index + startIndex
        }
      };
    }

    function checkObstacles(position, obstacles) {
      if (!settings.obstacleCollisionEnabled) {
        return null;
      }

      if (!isValidPosition(position) || !Array.isArray(obstacles)) {
        return null;
      }

      const index = obstacles.findIndex(function (obstacle) {
        if (!obstacle || obstacle.active === false) {
          return false;
        }

        const target = obstacle.position || obstacle;

        return isValidPosition(target) && samePosition(position, target);
      });

      if (index === -1) {
        return null;
      }

      const obstacle = obstacles[index];

      return {
        type: COLLISION_TYPES.OBSTACLE,
        position: { ...position },
        fatal: obstacle.fatal !== false,
        details: {
          obstacleId: obstacle.id ?? null,
          obstacleType: obstacle.type ?? "unknown",
          obstacleIndex: index
        }
      };
    }

    function checkFood(position, foods) {
      if (!settings.foodCollisionEnabled) {
        return null;
      }

      if (!isValidPosition(position) || !Array.isArray(foods)) {
        return null;
      }

      const food = foods.find(function (item) {
        return item &&
          item.active !== false &&
          Number.isInteger(item.x) &&
          Number.isInteger(item.y) &&
          samePosition(position, item);
      });

      if (!food) {
        return null;
      }

      return {
        type: COLLISION_TYPES.FOOD,
        position: { ...position },
        fatal: false,
        details: {
          foodId: food.id ?? null,
          foodType: food.type ?? "normal",
          value: Number.isFinite(food.value) ? food.value : 0,
          growth: Number.isInteger(food.growth) ? food.growth : 0
        }
      };
    }

    function recordCollision(collision) {
      if (!collision) {
        return null;
      }

      collisionsDetected += 1;

      lastCollision = Object.freeze({
        ...collision,
        position: Object.freeze({ ...collision.position }),
        details: Object.freeze({ ...collision.details }),
        timestamp: Date.now()
      });

      if (typeof settings.onCollision === "function") {
        settings.onCollision(lastCollision);
      }

      return lastCollision;
    }

    function detect(input = {}) {
      checksPerformed += 1;

      const position = input.position;

      if (!isValidPosition(position)) {
        return {
          collided: false,
          type: COLLISION_TYPES.NONE,
          collision: null,
          invalidPosition: true
        };
      }

      const mode = input.mode || "classic";

      const checks = [
        function () {
          return checkWall(position, input.board, mode);
        },
        function () {
          return checkSelf(position, input.segments, {
            excludeHead: input.excludeHead !== false
          });
        },
        function () {
          return checkObstacles(position, input.obstacles);
        },
        function () {
          return checkFood(position, input.foods);
        }
      ];

      for (const check of checks) {
        const collision = check();

        if (collision) {
          const recorded = recordCollision(collision);

          return Object.freeze({
            collided: true,
            type: recorded.type,
            collision: recorded,
            fatal: recorded.fatal,
            invalidPosition: false
          });
        }
      }

      return Object.freeze({
        collided: false,
        type: COLLISION_TYPES.NONE,
        collision: null,
        fatal: false,
        invalidPosition: false
      });
    }

    function detectMovement(input = {}) {
      if (!input.snake || !Array.isArray(input.snake.segments)) {
        return {
          collided: false,
          type: COLLISION_TYPES.NONE,
          collision: null,
          invalidInput: true
        };
      }

      const head = input.nextPosition || input.snake.segments[0];

      return detect({
        position: head,
        board: input.board,
        segments: input.snake.segments,
        obstacles: input.obstacles,
        foods: input.foods,
        mode: input.mode,
        excludeHead: true
      });
    }

    function resetStatistics() {
      checksPerformed = 0;
      collisionsDetected = 0;
      lastCollision = null;
    }

    function getLastCollision() {
      return lastCollision;
    }

    function getStatistics() {
      return Object.freeze({
        checksPerformed,
        collisionsDetected,
        lastCollision
      });
    }

    function configure(nextSettings = {}) {
      Object.assign(settings, nextSettings);
      return Object.freeze({ ...settings });
    }

    return Object.freeze({
      detect,
      detectMovement,
      checkWall,
      checkSelf,
      checkObstacles,
      checkFood,
      configure,
      getLastCollision,
      getStatistics,
      resetStatistics,
      COLLISION_TYPES
    });
  }

  window.SnakeCollisionDetector = Object.freeze({
    create,
    COLLISION_TYPES
  });
})(window);