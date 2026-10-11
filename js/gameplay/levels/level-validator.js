(function (global) {
  "use strict";

  const DEFAULT_LIMITS = Object.freeze({
    minWidth: 5,
    minHeight: 5,
    maxWidth: 100,
    maxHeight: 100,
    maxObstacles: 500,
    maxObjectives: 100
  });

  function validate(level, options = {}) {
    const errors = [];
    const limits = { ...DEFAULT_LIMITS, ...options };

    if (!level || typeof level !== "object" || Array.isArray(level)) {
      return {
        valid: false,
        errors: ["Level must be a valid object."]
      };
    }

    const id = String(level.id ?? "").trim();

    if (!id) {
      errors.push("Level ID is required.");
    }

    if (
      !Number.isInteger(level.width) ||
      level.width < limits.minWidth ||
      level.width > limits.maxWidth
    ) {
      errors.push("Level width is outside the allowed range.");
    }

    if (
      !Number.isInteger(level.height) ||
      level.height < limits.minHeight ||
      level.height > limits.maxHeight
    ) {
      errors.push("Level height is outside the allowed range.");
    }

    if (
      typeof level.name !== "string" ||
      !level.name.trim()
    ) {
      errors.push("Level name is required.");
    }

    if (
      level.obstacles !== undefined &&
      !Array.isArray(level.obstacles)
    ) {
      errors.push("Level obstacles must be an array.");
    }

    if (
      level.objectives !== undefined &&
      !Array.isArray(level.objectives)
    ) {
      errors.push("Level objectives must be an array.");
    }

    const obstacles = Array.isArray(level.obstacles)
      ? level.obstacles
      : [];

    const objectives = Array.isArray(level.objectives)
      ? level.objectives
      : [];

    if (obstacles.length > limits.maxObstacles) {
      errors.push("Level contains too many obstacles.");
    }

    if (objectives.length > limits.maxObjectives) {
      errors.push("Level contains too many objectives.");
    }

    obstacles.forEach((obstacle, index) => {
      if (!isValidPosition(obstacle, level)) {
        errors.push("Invalid obstacle position at index " + index + ".");
      }
    });

    objectives.forEach((objective, index) => {
      if (!objective || typeof objective !== "object") {
        errors.push("Invalid objective at index " + index + ".");
        return;
      }

      if (
        objective.x !== undefined ||
        objective.y !== undefined
      ) {
        if (!isValidPosition(objective, level)) {
          errors.push("Invalid objective position at index " + index + ".");
        }
      }
    });

    if (level.spawn !== undefined && !isValidPosition(level.spawn, level)) {
      errors.push("Invalid spawn position.");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  function isValidPosition(position, level) {
    if (!position || typeof position !== "object") {
      return false;
    }

    return (
      Number.isInteger(position.x) &&
      Number.isInteger(position.y) &&
      position.x >= 0 &&
      position.y >= 0 &&
      position.x < level.width &&
      position.y < level.height
    );
  }

  function assertValid(level, options) {
    const result = validate(level, options);

    if (!result.valid) {
      throw new Error(
        "Invalid level definition: " + result.errors.join(" ")
      );
    }

    return level;
  }

  global.SnakeLevelValidator = Object.freeze({
    validate,
    isValidPosition,
    assertValid,
    DEFAULT_LIMITS
  });
})(window);