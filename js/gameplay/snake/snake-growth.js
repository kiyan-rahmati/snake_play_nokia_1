/**
 * Snake Nokia V2
 * Snake Growth Controller
 */

(function (window) {
  "use strict";

  function create(snakeModel, options = {}) {
    if (
      !snakeModel ||
      typeof snakeModel.grow !== "function" ||
      typeof snakeModel.getLength !== "function"
    ) {
      throw new TypeError("A valid snake model is required.");
    }

    const settings = {
      defaultGrowth: 1,
      maxLength: 10000,
      ...options
    };

    if (
      !Number.isInteger(settings.defaultGrowth) ||
      settings.defaultGrowth < 1
    ) {
      throw new RangeError("Default growth must be a positive integer.");
    }

    if (
      !Number.isInteger(settings.maxLength) ||
      settings.maxLength < 1
    ) {
      throw new RangeError("Maximum length must be a positive integer.");
    }

    let snake = null;
    let totalGrowth = 0;
    let growthEvents = 0;
    let rejectedGrowth = 0;

    function attach(snakeInstance) {
      if (
        !snakeInstance ||
        !Array.isArray(snakeInstance.segments) ||
        snakeInstance.segments.length === 0
      ) {
        throw new TypeError("A valid snake instance is required.");
      }

      snake = snakeInstance;
      totalGrowth = 0;
      growthEvents = 0;
      rejectedGrowth = 0;

      return getState();
    }

    function add(amount = settings.defaultGrowth) {
      if (!snake || !snake.alive) {
        rejectedGrowth += 1;
        return false;
      }

      if (!Number.isInteger(amount) || amount < 1) {
        throw new RangeError("Growth amount must be a positive integer.");
      }

      const currentLength = snakeModel.getLength(snake);
      const pendingGrowth = Number.isInteger(snake.pendingGrowth)
        ? snake.pendingGrowth
        : 0;

      const availableGrowth = settings.maxLength -
        currentLength -
        pendingGrowth;

      if (availableGrowth <= 0) {
        rejectedGrowth += 1;
        return false;
      }

      const acceptedAmount = Math.min(amount, availableGrowth);

      const success = snakeModel.grow(snake, acceptedAmount);

      if (!success) {
        rejectedGrowth += 1;
        return false;
      }

      totalGrowth += acceptedAmount;
      growthEvents += 1;

      return Object.freeze({
        requested: amount,
        accepted: acceptedAmount,
        currentLength,
        pendingGrowth: pendingGrowth + acceptedAmount,
        reachedLimit: acceptedAmount < amount
      });
    }

    function addFromFood(food) {
      if (!food || typeof food !== "object") {
        return add(settings.defaultGrowth);
      }

      const amount = Number.isInteger(food.growth) && food.growth > 0
        ? food.growth
        : settings.defaultGrowth;

      return add(amount);
    }

    function canGrow(amount = settings.defaultGrowth) {
      if (!snake || !snake.alive) {
        return false;
      }

      if (!Number.isInteger(amount) || amount < 1) {
        return false;
      }

      const currentLength = snakeModel.getLength(snake);
      const pendingGrowth = Number.isInteger(snake.pendingGrowth)
        ? snake.pendingGrowth
        : 0;

      return currentLength + pendingGrowth < settings.maxLength &&
        amount > 0;
    }

    function getRemainingCapacity() {
      if (!snake) {
        return settings.maxLength;
      }

      const currentLength = snakeModel.getLength(snake);
      const pendingGrowth = Number.isInteger(snake.pendingGrowth)
        ? snake.pendingGrowth
        : 0;

      return Math.max(
        0,
        settings.maxLength - currentLength - pendingGrowth
      );
    }

    function getState() {
      return Object.freeze({
        attached: Boolean(snake),
        alive: Boolean(snake && snake.alive),
        currentLength: snake ? snakeModel.getLength(snake) : 0,
        pendingGrowth: snake && Number.isInteger(snake.pendingGrowth)
          ? snake.pendingGrowth
          : 0,
        totalGrowth,
        growthEvents,
        rejectedGrowth,
        maxLength: settings.maxLength,
        remainingCapacity: getRemainingCapacity()
      });
    }

    function reset() {
      totalGrowth = 0;
      growthEvents = 0;
      rejectedGrowth = 0;
      return getState();
    }

    function detach() {
      snake = null;
      totalGrowth = 0;
      growthEvents = 0;
      rejectedGrowth = 0;
    }

    return Object.freeze({
      attach,
      add,
      addFromFood,
      canGrow,
      getRemainingCapacity,
      getState,
      reset,
      detach
    });
  }

  window.SnakeGrowth = Object.freeze({
    create
  });
})(window);