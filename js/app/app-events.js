/**
 * Snake Nokia V2
 * Application Events
 */

(function (window, document) {
  "use strict";

  const EVENT_PREFIX = "snake:";

  const state = {
    initialized: false,
    listeners: [],
    eventCount: 0
  };

  /**
   * Validate an event name.
   */
  function normalizeEventName(eventName) {
    if (
      typeof eventName !== "string" ||
      !eventName.trim()
    ) {
      throw new TypeError("A valid event name is required.");
    }

    const normalized = eventName.trim();

    return normalized.startsWith(EVENT_PREFIX)
      ? normalized
      : `${EVENT_PREFIX}${normalized}`;
  }

  /**
   * Emit an application event.
   */
  function emit(eventName, detail) {
    const normalizedName = normalizeEventName(eventName);

    const event = new CustomEvent(normalizedName, {
      detail: detail === undefined ? null : detail,
      bubbles: false,
      cancelable: false
    });

    state.eventCount += 1;

    document.dispatchEvent(event);

    return event;
  }

  /**
   * Subscribe to an application event.
   */
  function on(eventName, callback, options) {
    if (typeof callback !== "function") {
      throw new TypeError("Event callback must be a function.");
    }

    const normalizedName = normalizeEventName(eventName);
    const settings = Object.assign(
      { once: false },
      options || {}
    );

    const handler = function (event) {
      callback(event.detail, event);
    };

    document.addEventListener(
      normalizedName,
      handler,
      { once: settings.once }
    );

    const subscription = {
      eventName: normalizedName,
      handler
    };

    state.listeners.push(subscription);

    return function unsubscribe() {
      document.removeEventListener(
        normalizedName,
        handler
      );

      state.listeners = state.listeners.filter(
        function (item) {
          return item !== subscription;
        }
      );
    };
  }

  /**
   * Remove subscriptions matching an event name.
   */
  function off(eventName) {
    const normalizedName = normalizeEventName(eventName);

    const matching = state.listeners.filter(
      function (item) {
        return item.eventName === normalizedName;
      }
    );

    matching.forEach(function (item) {
      document.removeEventListener(
        item.eventName,
        item.handler
      );
    });

    state.listeners = state.listeners.filter(
      function (item) {
        return item.eventName !== normalizedName;
      }
    );

    return matching.length;
  }

  /**
   * Remove every subscription created through this module.
   */
  function removeAllListeners() {
    state.listeners.forEach(function (item) {
      document.removeEventListener(
        item.eventName,
        item.handler
      );
    });

    const removedCount = state.listeners.length;

    state.listeners = [];

    return removedCount;
  }

  /**
   * Set up application-level event monitoring.
   */
  function initialize() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;

    document.addEventListener(
      "snake:startup-error",
      function (event) {
        console.error(
          "[SnakeAppEvents] Application startup error:",
          event.detail
        );
      }
    );

    document.addEventListener(
      "snake:bootstrap-error",
      function (event) {
        console.error(
          "[SnakeAppEvents] Bootstrap error:",
          event.detail
        );
      }
    );

    document.addEventListener(
      "snake:app-ready",
      function (event) {
        console.info(
          "[SnakeAppEvents] Application is ready.",
          event.detail
        );
      }
    );
  }

  /**
   * Return event system statistics.
   */
  function getStats() {
    return {
      initialized: state.initialized,
      activeSubscriptions: state.listeners.length,
      emittedEvents: state.eventCount
    };
  }

  /**
   * Expose the event API.
   */
  window.SnakeAppEvents = Object.freeze({
    initialize,
    emit,
    on,
    off,
    removeAllListeners,
    getStats
  });
})(window, document);