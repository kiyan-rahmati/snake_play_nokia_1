/**
 * Snake Nokia V2
 * Food Model
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    type: "normal",
    value: 10,
    growth: 1,
    color: "#ff5252",
    pointsMultiplier: 1,
    expiresAt: null,
    id: null
  });

  const FOOD_TYPES = Object.freeze({
    NORMAL: "normal",
    BONUS: "bonus",
    GOLDEN: "golden",
    SPEED: "speed",
    SLOW: "slow",
    EXTRA_LIFE: "extra-life"
  });

  const TYPE_SETTINGS = Object.freeze({
    normal: Object.freeze({
      value: 10,
      growth: 1,
      color: "#ff5252",
      pointsMultiplier: 1
    }),
    bonus: Object.freeze({
      value: 25,
      growth: 2,
      color: "#ffb74d",
      pointsMultiplier: 1
    }),
    golden: Object.freeze({
      value: 50,
      growth: 3,
      color: "#ffd700",
      pointsMultiplier: 2
    }),
    speed: Object.freeze({
      value: 15,
      growth: 1,
      color: "#42a5f5",
      pointsMultiplier: 1
    }),
    slow: Object.freeze({
      value: 15,
      growth: 1,
      color: "#ab47bc",
      pointsMultiplier: 1
    }),
    "extra-life": Object.freeze({
      value: 100,
      growth: 1,
      color: "#66bb6a",
      pointsMultiplier: 1
    })
  });

  let nextId = 1;

  function create(position, options = {}) {
    if (
      !position ||
      !Number.isInteger(position.x) ||
      !Number.isInteger(position.y)
    ) {
      throw new TypeError("Food position must contain integer x and y coordinates.");
    }

    const type = options.type || DEFAULTS.type;

    if (!Object.prototype.hasOwnProperty.call(TYPE_SETTINGS, type)) {
      throw new TypeError(`Unsupported food type: ${type}`);
    }

    const typeSettings = TYPE_SETTINGS[type];

    const value = options.value ?? typeSettings.value;
    const growth = options.growth ?? typeSettings.growth;
    const pointsMultiplier =
      options.pointsMultiplier ?? typeSettings.pointsMultiplier;

    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("Food value must be a non-negative number.");
    }

    if (!Number.isInteger(growth) || growth < 0) {
      throw new RangeError("Food growth must be a non-negative integer.");
    }

    if (!Number.isFinite(pointsMultiplier) || pointsMultiplier < 0) {
      throw new RangeError("Food points multiplier must be non-negative.");
    }

    const expiresAt = options.expiresAt ?? DEFAULTS.expiresAt;

    if (expiresAt !== null && !Number.isFinite(expiresAt)) {
      throw new TypeError("Food expiration must be a timestamp or null.");
    }

    return {
      id: options.id ?? `food-${nextId++}`,
      type,
      x: position.x,
      y: position.y,
      value,
      growth,
      color: options.color || typeSettings.color || DEFAULTS.color,
      pointsMultiplier,
      expiresAt,
      createdAt: Number.isFinite(options.createdAt)
        ? options.createdAt
        : Date.now(),
      active: true
    };
  }

  function isValid(food) {
    return Boolean(
      food &&
      typeof food.id === "string" &&
      Object.prototype.hasOwnProperty.call(TYPE_SETTINGS, food.type) &&
      Number.isInteger(food.x) &&
      Number.isInteger(food.y) &&
      Number.isFinite(food.value) &&
      food.value >= 0 &&
      Number.isInteger(food.growth) &&
      food.growth >= 0 &&
      typeof food.active === "boolean"
    );
  }

  function move(food, position) {
    if (!isValid(food) || !food.active) {
      return false;
    }

    if (
      !position ||
      !Number.isInteger(position.x) ||
      !Number.isInteger(position.y)
    ) {
      throw new TypeError("New food position must contain integer coordinates.");
    }

    food.x = position.x;
    food.y = position.y;

    return true;
  }

  function consume(food) {
    if (!isValid(food) || !food.active) {
      return null;
    }

    food.active = false;

    return Object.freeze({
      id: food.id,
      type: food.type,
      position: Object.freeze({
        x: food.x,
        y: food.y
      }),
      value: food.value,
      growth: food.growth,
      pointsMultiplier: food.pointsMultiplier,
      color: food.color
    });
  }

  function expire(food, now = Date.now()) {
    if (!isValid(food) || !food.active) {
      return false;
    }

    if (food.expiresAt === null || now < food.expiresAt) {
      return false;
    }

    food.active = false;

    return true;
  }

  function isExpired(food, now = Date.now()) {
    return Boolean(
      isValid(food) &&
      food.expiresAt !== null &&
      now >= food.expiresAt
    );
  }

  function getPosition(food) {
    if (!isValid(food)) {
      return null;
    }

    return Object.freeze({
      x: food.x,
      y: food.y
    });
  }

  function getPoints(food, multiplier = 1) {
    if (!isValid(food)) {
      return 0;
    }

    if (!Number.isFinite(multiplier) || multiplier < 0) {
      throw new RangeError("Score multiplier must be non-negative.");
    }

    return Math.floor(
      food.value *
      food.pointsMultiplier *
      multiplier
    );
  }

  function getSnapshot(food) {
    if (!isValid(food)) {
      return null;
    }

    return Object.freeze({
      id: food.id,
      type: food.type,
      x: food.x,
      y: food.y,
      value: food.value,
      growth: food.growth,
      color: food.color,
      pointsMultiplier: food.pointsMultiplier,
      expiresAt: food.expiresAt,
      createdAt: food.createdAt,
      active: food.active
    });
  }

  function resetIds() {
    nextId = 1;
  }

  window.SnakeFoodModel = Object.freeze({
    create,
    isValid,
    move,
    consume,
    expire,
    isExpired,
    getPosition,
    getPoints,
    getSnapshot,
    resetIds,
    FOOD_TYPES,
    TYPE_SETTINGS
  });
})(window);