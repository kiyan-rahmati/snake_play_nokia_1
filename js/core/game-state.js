/**
 * Snake Nokia V2
 * Game State Manager
 */

(function (window) {
  "use strict";

  const INITIAL_STATE = {
    status: "idle",
    mode: "classic",
    worldId: "nokia-origins",
    level: 1,
    score: 0,
    highScore: 0,
    lives: 3,
    snake: [],
    food: null,
    obstacles: [],
    powerUps: [],
    direction: "right",
    nextDirection: "right",
    speed: 5,
    elapsedTime: 0,
    paused: false,
    gameOver: false
  };

  let currentState = createInitialState();
  let revision = 0;

  const subscribers = new Set();

  function createInitialState(overrides = {}) {
    return Object.assign({}, INITIAL_STATE, overrides, {
      snake: Array.isArray(overrides.snake)
        ? overrides.snake.map(copyValue)
        : [],
      obstacles: Array.isArray(overrides.obstacles)
        ? overrides.obstacles.map(copyValue)
        : [],
      powerUps: Array.isArray(overrides.powerUps)
        ? overrides.powerUps.map(copyValue)
        : []
    });
  }

  function copyValue(value) {
    if (Array.isArray(value)) {
      return value.map(copyValue);
    }

    if (value && typeof value === "object") {
      const copy = {};

      Object.keys(value).forEach(function (key) {
        copy[key] = copyValue(value[key]);
      });

      return copy;
    }

    return value;
  }

  function freezeValue(value) {
    if (!value || typeof value !== "object") {
      return value;
    }

    Object.keys(value).forEach(function (key) {
      freezeValue(value[key]);
    });

    return Object.freeze(value);
  }

  function getState() {
    return freezeValue(copyValue(currentState));
  }

  function notify(previousState, changedKeys) {
    revision += 1;

    const snapshot = getState();
    const metadata = {
      revision,
      changedKeys: changedKeys.slice()
    };

    subscribers.forEach(function (callback) {
      try {
        callback(snapshot, metadata);
      } catch (error) {
        console.error(
          "[GameState] Subscriber failed:",
          error
        );
      }
    });

    if (window.document) {
      window.document.dispatchEvent(
        new CustomEvent("snake:state-changed", {
          detail: {
            state: snapshot,
            previousState: freezeValue(copyValue(previousState)),
            ...metadata
          }
        })
      );
    }
  }

  function setState(updates) {
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      throw new TypeError("State updates must be an object.");
    }

    const previousState = copyValue(currentState);
    const changedKeys = [];

    Object.keys(updates).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(INITIAL_STATE, key)) {
        return;
      }

      const value = updates[key];

      if (currentState[key] !== value) {
        currentState[key] = copyValue(value);
        changedKeys.push(key);
      }
    });

    if (changedKeys.length > 0) {
      notify(previousState, changedKeys);
    }

    return getState();
  }

  function updateState(updater) {
    if (typeof updater !== "function") {
      throw new TypeError("Updater must be a function.");
    }

    const updates = updater(getState());

    if (!updates || typeof updates !== "object") {
      throw new TypeError("Updater must return an object.");
    }

    return setState(updates);
  }

  function reset(overrides = {}) {
    const previousState = copyValue(currentState);

    currentState = createInitialState(overrides);

    notify(previousState, Object.keys(INITIAL_STATE));

    return getState();
  }

  function subscribe(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Subscriber must be a function.");
    }

    subscribers.add(callback);

    return function unsubscribe() {
      subscribers.delete(callback);
    };
  }

  function getRevision() {
    return revision;
  }

  function select(selector) {
    if (typeof selector !== "function") {
      throw new TypeError("Selector must be a function.");
    }

    return selector(getState());
  }

  window.SnakeGameState = Object.freeze({
    getState,
    setState,
    updateState,
    reset,
    subscribe,
    select,
    getRevision
  });
})(window);