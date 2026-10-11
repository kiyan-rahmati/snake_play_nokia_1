/**
 * Snake Nokia V2
 * Obstacle System
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    enabled: true,
    initialCount: 3,
    maxCount: 30,
    minDistanceFromSnake: 3,
    minDistanceFromFood: 2,
    avoidAdjacentObstacles: true
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    let obstacles = [];
    let nextId = 1;
    let enabled = Boolean(settings.enabled);
    let history = [];

    function normalizePosition(position) {
      if (!position) {
        return null;
      }

      const x = Number(position.x);
      const y = Number(position.y);

      if (!Number.isInteger(x) || !Number.isInteger(y)) {
        return null;
      }

      return { x, y };
    }

    function samePosition(a, b) {
      return Boolean(
        a &&
        b &&
        a.x === b.x &&
        a.y === b.y
      );
    }

    function distance(a, b) {
      if (!a || !b) {
        return Infinity;
      }

      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    function record(type, obstacle, metadata = {}) {
      history.push(Object.freeze({
        type,
        obstacle: obstacle ? { ...obstacle } : null,
        timestamp: Date.now(),
        ...metadata
      }));

      if (history.length > 100) {
        history.shift();
      }
    }

    function isOccupied(position, extraOccupied = []) {
      if (obstacles.some((obstacle) =>
        samePosition(obstacle, position)
      )) {
        return true;
      }

      return extraOccupied.some((item) => {
        const normalized = normalizePosition(item);
        return samePosition(normalized, position);
      });
    }

    function isValidPosition(
      position,
      bounds,
      extraOccupied = []
    ) {
      const point = normalizePosition(position);

      if (!point || !bounds) {
        return false;
      }

      const width = Number(bounds.width);
      const height = Number(bounds.height);

      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return false;
      }

      if (
        point.x < 0 ||
        point.y < 0 ||
        point.x >= width ||
        point.y >= height
      ) {
        return false;
      }

      if (isOccupied(point, extraOccupied)) {
        return false;
      }

      const snakeSegments = extraOccupied.filter((item) =>
        item && item.isSnakeSegment
      );

      for (const segment of snakeSegments) {
        if (
          distance(point, segment) <
          settings.minDistanceFromSnake
        ) {
          return false;
        }
      }

      const foodItems = extraOccupied.filter((item) =>
        item && item.isFood
      );

      for (const food of foodItems) {
        if (
          distance(point, food) <
          settings.minDistanceFromFood
        ) {
          return false;
        }
      }

      if (settings.avoidAdjacentObstacles) {
        for (const obstacle of obstacles) {
          if (distance(point, obstacle) <= 1) {
            return false;
          }
        }
      }

      return true;
    }

    function generatePosition(
      bounds,
      extraOccupied = [],
      maxAttempts = 200
    ) {
      if (!bounds) {
        return null;
      }

      const width = Number(bounds.width);
      const height = Number(bounds.height);

      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return null;
      }

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const position = {
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height)
        };

        if (
          isValidPosition(
            position,
            bounds,
            extraOccupied
          )
        ) {
          return position;
        }
      }

      return null;
    }

    function addObstacle(
      position,
      bounds,
      extraOccupied = [],
      metadata = {}
    ) {
      if (!enabled) {
        return null;
      }

      const point = normalizePosition(position);

      if (
        !point ||
        !isValidPosition(point, bounds, extraOccupied) ||
        obstacles.length >= settings.maxCount
      ) {
        return null;
      }

      const obstacle = Object.freeze({
        id: `obstacle-${nextId++}`,
        x: point.x,
        y: point.y,
        type: metadata.type || "block",
        destructible: Boolean(metadata.destructible),
        health: Math.max(
          1,
          Math.floor(Number(metadata.health) || 1)
        ),
        createdAt: Date.now()
      });

      obstacles.push(obstacle);
      record("add", obstacle);

      return obstacle;
    }

    function spawnObstacle(
      bounds,
      extraOccupied = [],
      metadata = {}
    ) {
      const position = generatePosition(
        bounds,
        extraOccupied
      );

      if (!position) {
        return null;
      }

      return addObstacle(
        position,
        bounds,
        extraOccupied,
        metadata
      );
    }

    function spawnMany(
      count,
      bounds,
      extraOccupied = [],
      metadata = {}
    ) {
      const requested = Math.max(
        0,
        Math.floor(Number(count) || 0)
      );

      const results = [];

      for (
        let i = 0;
        i < requested &&
        obstacles.length < settings.maxCount;
        i += 1
      ) {
        const obstacle = spawnObstacle(
          bounds,
          extraOccupied,
          metadata
        );

        if (!obstacle) {
          break;
        }

        results.push(obstacle);
      }

      return results;
    }

    function removeObstacle(id) {
      const index = obstacles.findIndex(
        (obstacle) => obstacle.id === id
      );

      if (index === -1) {
        return false;
      }

      const [removed] = obstacles.splice(index, 1);
      record("remove", removed);

      return true;
    }

    function removeAt(x, y) {
      const index = obstacles.findIndex(
        (obstacle) =>
          obstacle.x === Number(x) &&
          obstacle.y === Number(y)
      );

      if (index === -1) {
        return false;
      }

      const [removed] = obstacles.splice(index, 1);
      record("remove", removed);

      return true;
    }

    function damageObstacle(id, damage = 1) {
      const index = obstacles.findIndex(
        (obstacle) => obstacle.id === id
      );

      if (index === -1) {
        return Object.freeze({
          success: false,
          destroyed: false
        });
      }

      const obstacle = obstacles[index];

      if (!obstacle.destructible) {
        return Object.freeze({
          success: false,
          destroyed: false,
          reason: "indestructible"
        });
      }

      const amount = Number(damage);

      if (!Number.isFinite(amount) || amount <= 0) {
        return Object.freeze({
          success: false,
          destroyed: false,
          reason: "invalid-damage"
        });
      }

      const remainingHealth = obstacle.health -
        Math.floor(amount);

      if (remainingHealth <= 0) {
        obstacles.splice(index, 1);
        record("destroy", obstacle);

        return Object.freeze({
          success: true,
          destroyed: true,
          id
        });
      }

      const updated = Object.freeze({
        ...obstacle,
        health: remainingHealth
      });

      obstacles[index] = updated;
      record("damage", updated);

      return Object.freeze({
        success: true,
        destroyed: false,
        obstacle: updated
      });
    }

    function clear() {
      const removedCount = obstacles.length;
      obstacles = [];
      record("clear", null, { removedCount });

      return removedCount;
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      return enabled;
    }

    function isEnabled() {
      return enabled;
    }

    function getObstacles() {
      return obstacles.map((obstacle) => ({
        ...obstacle
      }));
    }

    function getObstacleAt(x, y) {
      const obstacle = obstacles.find(
        (item) =>
          item.x === Number(x) &&
          item.y === Number(y)
      );

      return obstacle ? { ...obstacle } : null;
    }

    function isObstacleAt(x, y) {
      return obstacles.some(
        (item) =>
          item.x === Number(x) &&
          item.y === Number(y)
      );
    }

    function getCount() {
      return obstacles.length;
    }

    function getHistory() {
      return history.slice();
    }

    function getSnapshot() {
      return Object.freeze({
        enabled,
        count: obstacles.length,
        maxCount: settings.maxCount,
        obstacles: getObstacles()
      });
    }

    function reset() {
      obstacles = [];
      nextId = 1;
      history = [];
      enabled = Boolean(settings.enabled);

      return getSnapshot();
    }

    return Object.freeze({
      addObstacle,
      spawnObstacle,
      spawnMany,
      generatePosition,
      isValidPosition,
      removeObstacle,
      removeAt,
      damageObstacle,
      clear,
      setEnabled,
      isEnabled,
      getObstacles,
      getObstacleAt,
      isObstacleAt,
      getCount,
      getHistory,
      getSnapshot,
      reset
    });
  }

  window.SnakeObstacleSystem = Object.freeze({
    create,
    DEFAULTS
  });
})(window);