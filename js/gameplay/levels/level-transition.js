(function (global) {
  "use strict";

  const DEFAULT_DURATION = 700;

  let transitioning = false;
  let transitionId = 0;
  let activeTransition = null;

  function transitionTo(levelId, options = {}) {
    if (transitioning) {
      return Promise.reject(
        new Error("A level transition is already in progress.")
      );
    }

    const loader = global.SnakeLevelLoader;

    if (!loader || typeof loader.load !== "function") {
      return Promise.reject(
        new Error("SnakeLevelLoader is not available.")
      );
    }

    const duration = normalizeDuration(options.duration);
    const id = ++transitionId;

    transitioning = true;

    const transition = {
      id,
      levelId,
      startedAt: Date.now(),
      duration
    };

    activeTransition = transition;

    emit("snake:level-transition-start", transition);

    return new Promise((resolve, reject) => {
      const finish = () => {
        if (!activeTransition || activeTransition.id !== id) {
          return;
        }

        try {
          const level = loader.load(levelId);

          transitioning = false;
          activeTransition = null;

          const result = {
            id,
            levelId,
            level,
            duration,
            completedAt: Date.now()
          };

          emit("snake:level-transition-complete", result);
          resolve(result);
        } catch (error) {
          transitioning = false;
          activeTransition = null;

          emit("snake:level-transition-error", {
            id,
            levelId,
            error
          });

          reject(error);
        }
      };

      if (duration === 0) {
        finish();
        return;
      }

      const timer = global.setTimeout(finish, duration);

      activeTransition.cancel = () => {
        global.clearTimeout(timer);
        transitioning = false;
        activeTransition = null;

        emit("snake:level-transition-cancel", {
          id,
          levelId,
          cancelledAt: Date.now()
        });
      };
    });
  }

  function cancel() {
    if (!activeTransition || typeof activeTransition.cancel !== "function") {
      return false;
    }

    activeTransition.cancel();
    return true;
  }

  function isTransitioning() {
    return transitioning;
  }

  function getActiveTransition() {
    return activeTransition
      ? {
          id: activeTransition.id,
          levelId: activeTransition.levelId,
          startedAt: activeTransition.startedAt,
          duration: activeTransition.duration
        }
      : null;
  }

  function normalizeDuration(value) {
    const duration = value === undefined ? DEFAULT_DURATION : Number(value);

    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError("Transition duration must be a non-negative number.");
    }

    return Math.floor(duration);
  }

  function emit(name, detail) {
    global.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

  global.SnakeLevelTransition = Object.freeze({
    transitionTo,
    cancel,
    isTransitioning,
    getActiveTransition,
    DEFAULT_DURATION
  });
})(window);