/**
 * Snake Nokia V2
 * Food Spawner
 */

(function (window) {
  "use strict";

  function create(foodModel, options = {}) {
    if (!foodModel || typeof foodModel.create !== "function") {
      throw new TypeError("A valid food model is required.");
    }

    const settings = {
      minDistanceFromSnake: 0,
      maxAttempts: 500,
      defaultType: "normal",
      ...options
    };

    if (
      !Number.isInteger(settings.maxAttempts) ||
      settings.maxAttempts < 1
    ) {
      throw new RangeError("maxAttempts must be a positive integer.");
    }

    let board = { width: 20, height: 20 };
    let snakeProvider = null;
    let foods = [];
    let spawnCount = 0;
    let failedSpawns = 0;

    function configureBoard(width, height) {
      if (
        !Number.isInteger(width) ||
        !Number.isInteger(height) ||
        width < 1 ||
        height < 1
      ) {
        throw new RangeError("Board dimensions must be positive integers.");
      }

      board = { width, height };
      return getBoard();
    }

    function setSnakeProvider(provider) {
      if (provider !== null && typeof provider !== "function") {
        throw new TypeError("Snake provider must be a function or null.");
      }

      snakeProvider = provider;
    }

    function getSnakeSegments() {
      if (!snakeProvider) {
        return [];
      }

      const snake = snakeProvider();

      if (Array.isArray(snake)) {
        return snake;
      }

      if (snake && Array.isArray(snake.segments)) {
        return snake.segments;
      }

      return [];
    }

    function isOccupied(x, y, extraOccupied = []) {
      const snakeSegments = getSnakeSegments();

      const occupiedBySnake = snakeSegments.some(function (segment) {
        return segment.x === x && segment.y === y;
      });

      if (occupiedBySnake) {
        return true;
      }

      const occupiedByFood = foods.some(function (food) {
        return food.active && food.x === x && food.y === y;
      });

      if (occupiedByFood) {
        return true;
      }

      return extraOccupied.some(function (position) {
        return position.x === x && position.y === y;
      });
    }

    function getAvailableCells(extraOccupied = []) {
      const snakeSegments = getSnakeSegments();
      const occupied = new Set();

      snakeSegments.forEach(function (segment) {
        occupied.add(`${segment.x},${segment.y}`);
      });

      foods.forEach(function (food) {
        if (food.active) {
          occupied.add(`${food.x},${food.y}`);
        }
      });

      extraOccupied.forEach(function (position) {
        occupied.add(`${position.x},${position.y}`);
      });

      const cells = [];

      for (let y = 0; y < board.height; y += 1) {
        for (let x = 0; x < board.width; x += 1) {
          if (!occupied.has(`${x},${y}`)) {
            cells.push({ x, y });
          }
        }
      }

      return cells;
    }

    function randomPosition(extraOccupied = []) {
      const cells = getAvailableCells(extraOccupied);

      if (cells.length === 0) {
        return null;
      }

      const index = Math.floor(Math.random() * cells.length);
      return cells[index];
    }

    function spawn(spawnOptions = {}) {
      const extraOccupied = Array.isArray(spawnOptions.occupied)
        ? spawnOptions.occupied
        : [];

      let position = null;

      for (
        let attempt = 0;
        attempt < settings.maxAttempts;
        attempt += 1
      ) {
        const candidate = {
          x: Math.floor(Math.random() * board.width),
          y: Math.floor(Math.random() * board.height)
        };

        if (!isOccupied(candidate.x, candidate.y, extraOccupied)) {
          position = candidate;
          break;
        }
      }

      if (!position) {
        position = randomPosition(extraOccupied);
      }

      if (!position) {
        failedSpawns += 1;

        return Object.freeze({
          success: false,
          reason: "board-full",
          food: null
        });
      }

      const food = foodModel.create(position, {
        ...spawnOptions,
        occupied: undefined,
        type: spawnOptions.type || settings.defaultType
      });

      foods.push(food);
      spawnCount += 1;

      return Object.freeze({
        success: true,
        reason: null,
        food
      });
    }

    function spawnMany(count, spawnOptions = {}) {
      if (!Number.isInteger(count) || count < 0) {
        throw new RangeError("Food count must be a non-negative integer.");
      }

      const results = [];

      for (let index = 0; index < count; index += 1) {
        const result = spawn(spawnOptions);

        if (!result.success) {
          break;
        }

        results.push(result.food);
      }

      return results;
    }

    function remove(foodId) {
      const index = foods.findIndex(function (food) {
        return food.id === foodId;
      });

      if (index === -1) {
        return false;
      }

      foods.splice(index, 1);
      return true;
    }

    function removeInactive() {
      const previousCount = foods.length;

      foods = foods.filter(function (food) {
        return food.active;
      });

      return previousCount - foods.length;
    }

    function expireFoods(now = Date.now()) {
      let expiredCount = 0;

      foods.forEach(function (food) {
        if (
          food.active &&
          typeof foodModel.expire === "function" &&
          foodModel.expire(food, now)
        ) {
          expiredCount += 1;
        }
      });

      return expiredCount;
    }

    function getFoods(options = {}) {
      const includeInactive = options.includeInactive === true;

      return foods
        .filter(function (food) {
          return includeInactive || food.active;
        })
        .map(function (food) {
          return { ...food };
        });
    }

    function getFoodAt(x, y) {
      const food = foods.find(function (item) {
        return item.active && item.x === x && item.y === y;
      });

      return food || null;
    }

    function clear() {
      const removedCount = foods.length;
      foods = [];

      return removedCount;
    }

    function resetStatistics() {
      spawnCount = 0;
      failedSpawns = 0;
    }

    function getBoard() {
      return Object.freeze({
        width: board.width,
        height: board.height
      });
    }

    function getState() {
      return Object.freeze({
        board: getBoard(),
        activeFoodCount: foods.filter(function (food) {
          return food.active;
        }).length,
        totalFoodObjects: foods.length,
        spawnCount,
        failedSpawns
      });
    }

    return Object.freeze({
      configureBoard,
      setSnakeProvider,
      isOccupied,
      getAvailableCells,
      randomPosition,
      spawn,
      spawnMany,
      remove,
      removeInactive,
      expireFoods,
      getFoods,
      getFoodAt,
      clear,
      resetStatistics,
      getBoard,
      getState
    });
  }

  window.SnakeFoodSpawner = Object.freeze({
    create
  });
})(window);