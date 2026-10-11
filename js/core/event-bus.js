/**
 * Snake Nokia V2
 * Event Bus
 */

(function (window) {
  "use strict";

  const events = new Map();
  let eventCount = 0;

  function validateEventName(eventName) {
    if (
      typeof eventName !== "string" ||
      eventName.trim().length === 0
    ) {
      throw new TypeError("A valid event name is required.");
    }

    return eventName.trim();
  }

  function on(eventName, callback, options = {}) {
    const name = validateEventName(eventName);

    if (typeof callback !== "function") {
      throw new TypeError("Event callback must be a function.");
    }

    if (!events.has(name)) {
      events.set(name, new Set());
    }

    const subscription = {
      callback,
      once: options.once === true,
      active: true
    };

    events.get(name).add(subscription);

    return function unsubscribe() {
      if (!subscription.active) {
        return;
      }

      subscription.active = false;

      const subscribers = events.get(name);

      if (subscribers) {
        subscribers.delete(subscription);

        if (subscribers.size === 0) {
          events.delete(name);
        }
      }
    };
  }

  function once(eventName, callback) {
    return on(eventName, callback, { once: true });
  }

  function emit(eventName, payload) {
    const name = validateEventName(eventName);
    const subscribers = events.get(name);

    eventCount += 1;

    if (!subscribers || subscribers.size === 0) {
      return 0;
    }

    const currentSubscribers = Array.from(subscribers);
    let executedCount = 0;

    currentSubscribers.forEach(function (subscription) {
      if (!subscription.active) {
        return;
      }

      if (subscription.once) {
        subscription.active = false;
        subscribers.delete(subscription);
      }

      try {
        subscription.callback(payload, name);
        executedCount += 1;
      } catch (error) {
        console.error(
          `[EventBus] Handler failed for "${name}":`,
          error
        );
      }
    });

    if (subscribers.size === 0) {
      events.delete(name);
    }

    return executedCount;
  }

  function off(eventName) {
    const name = validateEventName(eventName);
    const subscribers = events.get(name);

    if (!subscribers) {
      return 0;
    }

    const removedCount = subscribers.size;

    subscribers.forEach(function (subscription) {
      subscription.active = false;
    });

    events.delete(name);

    return removedCount;
  }

  function clear() {
    events.forEach(function (subscribers) {
      subscribers.forEach(function (subscription) {
        subscription.active = false;
      });
    });

    events.clear();
  }

  function listenerCount(eventName) {
    if (eventName === undefined) {
      let total = 0;

      events.forEach(function (subscribers) {
        total += subscribers.size;
      });

      return total;
    }

    const name = validateEventName(eventName);
    const subscribers = events.get(name);

    return subscribers ? subscribers.size : 0;
  }

  function getStats() {
    return Object.freeze({
      eventTypes: events.size,
      activeListeners: listenerCount(),
      emittedEvents: eventCount
    });
  }

  window.SnakeEventBus = Object.freeze({
    on,
    once,
    emit,
    off,
    clear,
    listenerCount,
    getStats
  });
})(window);