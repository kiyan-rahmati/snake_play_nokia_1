/**
 * Snake Nokia V2
 * Application Lifecycle
 */

(function (window, document) {
  "use strict";

  const state = {
    initialized: false,
    isVisible: !document.hidden,
    isOnline: navigator.onLine,
    startedAt: Date.now()
  };

  const handlers = [];

  function emit(eventName, detail) {
    document.dispatchEvent(
      new CustomEvent(`snake:${eventName}`, {
        detail: detail || {}
      })
    );
  }

  function register(target, eventName, callback) {
    target.addEventListener(eventName, callback);

    handlers.push({
      target,
      eventName,
      callback
    });
  }

  function handleVisibilityChange() {
    const wasVisible = state.isVisible;
    state.isVisible = !document.hidden;

    if (!state.isVisible && wasVisible) {
      emit("app-hidden", {
        timestamp: Date.now()
      });
      return;
    }

    if (state.isVisible && !wasVisible) {
      emit("app-visible", {
        timestamp: Date.now()
      });
    }
  }

  function handleOnline() {
    state.isOnline = true;

    emit("connection-restored", {
      timestamp: Date.now()
    });
  }

  function handleOffline() {
    state.isOnline = false;

    emit("connection-lost", {
      timestamp: Date.now()
    });
  }

  function handlePageHide(event) {
    emit("app-page-hide", {
      persisted: Boolean(event.persisted),
      timestamp: Date.now()
    });
  }

  function handlePageShow(event) {
    emit("app-page-show", {
      persisted: Boolean(event.persisted),
      timestamp: Date.now()
    });
  }

  function initialize() {
    if (state.initialized) {
      return;
    }

    register(
      document,
      "visibilitychange",
      handleVisibilityChange
    );

    register(window, "online", handleOnline);
    register(window, "offline", handleOffline);
    register(window, "pagehide", handlePageHide);
    register(window, "pageshow", handlePageShow);

    state.initialized = true;

    emit("lifecycle-ready", {
      visible: state.isVisible,
      online: state.isOnline,
      timestamp: Date.now()
    });
  }

  function getStatus() {
    return {
      initialized: state.initialized,
      visible: state.isVisible,
      online: state.isOnline,
      startedAt: state.startedAt,
      uptime: Date.now() - state.startedAt
    };
  }

  function destroy() {
    handlers.forEach(function (handler) {
      handler.target.removeEventListener(
        handler.eventName,
        handler.callback
      );
    });

    handlers.length = 0;
    state.initialized = false;
  }

  window.SnakeAppLifecycle = Object.freeze({
    initialize,
    getStatus,
    destroy
  });
})(window, document);