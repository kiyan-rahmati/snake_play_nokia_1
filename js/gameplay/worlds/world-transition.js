(function (global) {
  "use strict";

  const DEFAULT_DURATION = 900;

  let activeTransition = null;
  let transitionSequence = 0;

  function transitionTo(worldId, options = {}) {
    if (activeTransition) {
      return Promise.reject(
        new Error("A world transition is already in progress.")
      );
    }

    const manager = global.SnakeWorldManager;

    if (!manager || typeof manager.setWorld !== "function") {
      return Promise.reject(
        new Error("SnakeWorldManager is not available.")
      );
    }

    const duration = normalizeDuration(options.duration);
    const transitionId = ++transitionSequence;

    const transition = {
      id: transitionId,
      worldId,
      startedAt: Date.now(),
      duration,
      timer: null,
      resolve: null,
      reject: null
    };

    activeTransition = transition;

    emit("snake:world-transition-start", {
      id: transitionId,
      worldId,
      duration
    });

    return new Promise((resolve, reject) => {
      transition.resolve = resolve;
      transition.reject = reject;

      transition.timer = global.setTimeout(() => {
        if (activeTransition !== transition) {
          return;
        }

        try {
          const world = manager.setWorld(worldId, options);

          activeTransition = null;

          const result = {
            id: transitionId,
            world,
            duration,
            completedAt: Date.now()
          };

          emit("snake:world-transition-complete", result);
          resolve(result);
        } catch (error) {
          activeTransition = null;

          emit("snake:world-transition-error", {
            id: transitionId,
            worldId,
            error
          });

          reject(error);
        }
      }, duration);
    });
  }

  function cancel(reason = "cancelled") {
    if (!activeTransition) {
      return false;
    }

    const transition = activeTransition;
    activeTransition = null;

    if (transition.timer !== null) {
      global.clearTimeout(transition.timer);
    }

    const error = new Error("World transition " + reason + ".");
    error.name = "AbortError";

    emit("snake:world-transition-cancel", {
      id: transition.id,
      worldId: transition.worldId,
      reason
    });

    transition.reject(error);

    return true;
  }

  function isTransitioning() {
    return activeTransition !== null;
  }

  function getActiveTransition() {
    if (!activeTransition) {
      return null;
    }

    return {
      id: activeTransition.id,
      worldId: activeTransition.worldId,
      startedAt: activeTransition.startedAt,
      duration: activeTransition.duration
    };
  }

  function normalizeDuration(value) {
    const duration = value === undefined
      ? DEFAULT_DURATION
      : Number(value);

    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError(
        "Transition duration must be a non-negative number."
      );
    }

    return Math.floor(duration);
  }

  function emit(name, detail) {
    global.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  global.SnakeWorldTransition = Object.freeze({
    transitionTo,
    cancel,
    isTransitioning,
    getActiveTransition,
    DEFAULT_DURATION
  });
})(window);