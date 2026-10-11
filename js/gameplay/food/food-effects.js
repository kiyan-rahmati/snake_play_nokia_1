/**
 * Snake Nokia V2
 * Food Effects Controller
 */

(function (window) {
  "use strict";

  const DEFAULT_DURATIONS = Object.freeze({
    speed: 5000,
    slow: 5000,
    shield: 7000,
    doubleScore: 10000,
    magnet: 6000
  });

  function create(options = {}) {
    const durations = {
      ...DEFAULT_DURATIONS,
      ...(options.durations || {})
    };

    let activeEffects = new Map();
    let effectHistory = [];
    let nextEffectId = 1;

    const handlers = new Map();

    function registerHandler(type, handler) {
      if (typeof type !== "string" || !type.trim()) {
        throw new TypeError("Effect type must be a non-empty string.");
      }

      if (typeof handler !== "function") {
        throw new TypeError("Effect handler must be a function.");
      }

      handlers.set(type, handler);

      return function unregister() {
        return handlers.delete(type);
      };
    }

    function notify(eventName, detail) {
      const event = Object.freeze({
        type: eventName,
        detail: Object.freeze({ ...detail }),
        timestamp: Date.now()
      });

      if (typeof options.onEvent === "function") {
        options.onEvent(event);
      }

      return event;
    }

    function normalizeEffect(food, overrides = {}) {
      const type = overrides.type || food.type;

      const duration = Number.isFinite(overrides.duration)
        ? overrides.duration
        : durations[type] || 0;

      const multiplier = Number.isFinite(overrides.multiplier)
        ? overrides.multiplier
        : 1;

      return {
        id: `effect-${nextEffectId++}`,
        type,
        sourceFoodId: food.id || null,
        startedAt: Date.now(),
        expiresAt: duration > 0 ? Date.now() + duration : null,
        duration,
        multiplier,
        metadata: overrides.metadata || {}
      };
    }

    function apply(food, overrides = {}) {
      if (!food || typeof food !== "object") {
        return {
          success: false,
          reason: "invalid-food",
          effect: null
        };
      }

      const type = overrides.type || food.type;

      if (typeof type !== "string" || !type.trim()) {
        return {
          success: false,
          reason: "invalid-effect-type",
          effect: null
        };
      }

      const effect = normalizeEffect(food, overrides);
      const handler = handlers.get(type);

      if (handler) {
        try {
          const result = handler({
            food,
            effect: Object.freeze({ ...effect })
          });

          if (result === false) {
            return {
              success: false,
              reason: "handler-rejected",
              effect: null
            };
          }
        } catch (error) {
          notify("effect:error", {
            effectType: type,
            message: error instanceof Error
              ? error.message
              : String(error)
          });

          return {
            success: false,
            reason: "handler-error",
            effect: null
          };
        }
      }

      if (effect.duration > 0) {
        const existing = activeEffects.get(type);

        if (existing) {
          effect.startedAt = existing.startedAt;
        }

        activeEffects.set(type, effect);
      } else if (type === "extra-life") {
        notify("effect:instant", {
          effectType: type,
          sourceFoodId: effect.sourceFoodId
        });
      }

      effectHistory.push({
        id: effect.id,
        type: effect.type,
        sourceFoodId: effect.sourceFoodId,
        appliedAt: effect.startedAt,
        duration: effect.duration
      });

      notify("effect:applied", {
        effectId: effect.id,
        effectType: effect.type,
        duration: effect.duration,
        expiresAt: effect.expiresAt
      });

      return {
        success: true,
        reason: null,
        effect: Object.freeze({ ...effect })
      };
    }

    function remove(type, reason = "removed") {
      const effect = activeEffects.get(type);

      if (!effect) {
        return false;
      }

      activeEffects.delete(type);

      notify("effect:removed", {
        effectId: effect.id,
        effectType: effect.type,
        reason
      });

      return true;
    }

    function update(now = Date.now()) {
      const expired = [];

      activeEffects.forEach(function (effect, type) {
        if (
          effect.expiresAt !== null &&
          now >= effect.expiresAt
        ) {
          expired.push(type);
        }
      });

      expired.forEach(function (type) {
        remove(type, "expired");
      });

      return expired.length;
    }

    function has(type) {
      return activeEffects.has(type);
    }

    function get(type) {
      const effect = activeEffects.get(type);

      return effect ? Object.freeze({ ...effect }) : null;
    }

    function getMultiplier(type) {
      const effect = activeEffects.get(type);

      return effect ? effect.multiplier : 1;
    }

    function getScoreMultiplier() {
      return getMultiplier("doubleScore");
    }

    function getActiveEffects() {
      return Array.from(activeEffects.values()).map(function (effect) {
        return Object.freeze({ ...effect });
      });
    }

    function getHistory() {
      return effectHistory.map(function (entry) {
        return Object.freeze({ ...entry });
      });
    }

    function clear(reason = "cleared") {
      const types = Array.from(activeEffects.keys());

      types.forEach(function (type) {
        remove(type, reason);
      });

      return types.length;
    }

    function reset() {
      clear("reset");
      effectHistory = [];
      nextEffectId = 1;
    }

    function getState() {
      return Object.freeze({
        activeCount: activeEffects.size,
        activeTypes: Array.from(activeEffects.keys()),
        historyCount: effectHistory.length
      });
    }

    return Object.freeze({
      registerHandler,
      apply,
      remove,
      update,
      has,
      get,
      getMultiplier,
      getScoreMultiplier,
      getActiveEffects,
      getHistory,
      clear,
      reset,
      getState
    });
  }

  window.SnakeFoodEffects = Object.freeze({
    create,
    DEFAULT_DURATIONS
  });
})(window);