/**
 * Snake Nokia V2
 * Obstacle Collision Handler
 */

(function (window) {
  "use strict";

  function create(options = {}) {
    const settings = {
      fatalByDefault: true,
      onCollision: null,
      ...options
    };

    let obstacles = [];
    let collisionCount = 0;
    let lastCollision = null;

    function isValidPosition(position) {
      return Boolean(
        position &&
        Number.isInteger(position.x) &&
        Number.isInteger(position.y)
      );
    }

    function normalizeObstacle(obstacle, index) {
      if (!obstacle || typeof obstacle !== "object") {
        throw new TypeError("Obstacle must be an object.");
      }

      const position = obstacle.position || obstacle;

      if (!isValidPosition(position)) {
        throw new TypeError(
          "Obstacle must contain integer x and y coordinates."
        );
      }

      return {
        id: obstacle.id ?? `obstacle-${index + 1}`,
        type: obstacle.type || "wall",
        x: position.x,
        y: position.y,
        fatal: obstacle.fatal ?? settings.fatalByDefault,
        active: obstacle.active !== false,
        metadata: obstacle.metadata || {}
      };
    }

    function setObstacles(list) {
      if (!Array.isArray(list)) {
        throw new TypeError("Obstacles must be provided as an array.");
      }

      obstacles = list.map(normalizeObstacle);

      return getObstacles();
    }

    function addObstacle(obstacle) {
      const normalized = normalizeObstacle(obstacle, obstacles.length);

      const duplicate = obstacles.some(function (item) {
        return item.x === normalized.x &&
          item.y === normalized.y &&
          item.active;
      });

      if (duplicate) {
        return false;
      }

      obstacles.push(normalized);

      return Object.freeze({ ...normalized });
    }

    function removeObstacle(id) {
      const index = obstacles.findIndex(function (obstacle) {
        return obstacle.id === id;
      });

      if (index === -1) {
        return false;
      }

      obstacles.splice(index, 1);

      return true;
    }

    function setObstacleActive(id, active) {
      const obstacle = obstacles.find(function (item) {
        return item.id === id;
      });

      if (!obstacle) {
        return false;
      }

      obstacle.active = Boolean(active);

      return true;
    }

    function getObstacleAt(position) {
      if (!isValidPosition(position)) {
        return null;
      }

      const obstacle = obstacles.find(function (item) {
        return item.active &&
          item.x === position.x &&
          item.y === position.y;
      });

      return obstacle ? Object.freeze({ ...obstacle }) : null;
    }

    function check(position, options = {}) {
      if (!isValidPosition(position)) {
        return Object.freeze({
          collided: false,
          validInput: false,
          collision: null
        });
      }

      const ignoredIds = new Set(
        Array.isArray(options.ignoreIds) ? options.ignoreIds : []
      );

      const obstacle = obstacles.find(function (item) {
        return item.active &&
          !ignoredIds.has(item.id) &&
          item.x === position.x &&
          item.y === position.y;
      });

      if (!obstacle) {
        return Object.freeze({
          collided: false,
          validInput: true,
          collision: null
        });
      }

      const collision = Object.freeze({
        type: "obstacle",
        obstacleId: obstacle.id,
        obstacleType: obstacle.type,
        position: Object.freeze({
          x: position.x,
          y: position.y
        }),
        fatal: obstacle.fatal,
        timestamp: Date.now()
      });

      collisionCount += 1;
      lastCollision = collision;

      if (typeof settings.onCollision === "function") {
        settings.onCollision(collision);
      }

      return Object.freeze({
        collided: true,
        validInput: true,
        collision
      });
    }

    function isOccupied(position) {
      return Boolean(getObstacleAt(position));
    }

    function getObstacles(options = {}) {
      const includeInactive = options.includeInactive === true;

      return obstacles
        .filter(function (obstacle) {
          return includeInactive || obstacle.active;
        })
        .map(function (obstacle) {
          return Object.freeze({
            ...obstacle,
            metadata: { ...obstacle.metadata }
          });
        });
    }

    function clear() {
      const count = obstacles.length;
      obstacles = [];

      return count;
    }

    function resetStatistics() {
      collisionCount = 0;
      lastCollision = null;
    }

    function getStatistics() {
      return Object.freeze({
        obstacleCount: obstacles.length,
        activeObstacleCount: obstacles.filter(function (item) {
          return item.active;
        }).length,
        collisionCount,
        lastCollision
      });
    }

    return Object.freeze({
      setObstacles,
      addObstacle,
      removeObstacle,
      setObstacleActive,
      getObstacleAt,
      check,
      isOccupied,
      getObstacles,
      clear,
      resetStatistics,
      getStatistics
    });
  }

  window.SnakeObstacleCollision = Object.freeze({
    create
  });
})(window);