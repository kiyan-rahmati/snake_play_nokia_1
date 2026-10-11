/**
 * Snake Nokia V2
 * Application Bootstrap
 */

(function (window, document) {
  "use strict";

  const APP_NAMESPACE = "SnakeApp";

  const state = {
    initialized: false,
    initializing: false,
    config: null,
    startTime: null
  };

  /**
   * Log bootstrap messages.
   */
  function log(message, data) {
    if (data !== undefined) {
      console.info(`[${APP_NAMESPACE}] ${message}`, data);
      return;
    }

    console.info(`[${APP_NAMESPACE}] ${message}`);
  }

  /**
   * Report bootstrap errors.
   */
  function reportError(message, error) {
    console.error(`[${APP_NAMESPACE}] ${message}`, error || "");

    document.dispatchEvent(
      new CustomEvent("snake:bootstrap-error", {
        detail: {
          message,
          error: error || null
        }
      })
    );
  }

  /**
   * Load the application configuration.
   */
  async function loadConfiguration() {
    if (
      window.SnakeConfig &&
      typeof window.SnakeConfig.load === "function"
    ) {
      return window.SnakeConfig.load();
    }

    const configUrl = new URL(
      "data/app-config.json",
      document.baseURI
    );

    const response = await fetch(configUrl, {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(
        `Could not load application configuration (${response.status}).`
      );
    }

    return response.json();
  }

  /**
   * Initialize the application router when available.
   */
  async function initializeRouter() {
    if (
      window.SnakeRouter &&
      typeof window.SnakeRouter.initialize === "function"
    ) {
      await window.SnakeRouter.initialize();
      log("Router initialized.");
      return;
    }

    log("Router module is not available yet; skipping router setup.");
  }

  /**
   * Initialize application-level event handlers when available.
   */
  async function initializeEvents() {
    if (
      window.SnakeAppEvents &&
      typeof window.SnakeAppEvents.initialize === "function"
    ) {
      await window.SnakeAppEvents.initialize();
      log("Application events initialized.");
      return;
    }

    log("Application events module is not available yet.");
  }

  /**
   * Initialize lifecycle handlers when available.
   */
  async function initializeLifecycle() {
    if (
      window.SnakeAppLifecycle &&
      typeof window.SnakeAppLifecycle.initialize === "function"
    ) {
      await window.SnakeAppLifecycle.initialize();
      log("Application lifecycle initialized.");
      return;
    }

    log("Lifecycle module is not available yet.");
  }

  /**
   * Publish the loaded configuration to the application.
   */
  function publishConfiguration(config) {
    state.config = config;

    window.SnakeAppConfig = Object.freeze(config);

    document.dispatchEvent(
      new CustomEvent("snake:config-loaded", {
        detail: {
          config: window.SnakeAppConfig
        }
      })
    );
  }

  /**
   * Initialize the complete application.
   */
  async function bootstrap() {
    if (state.initialized) {
      return window.SnakeApp;
    }

    if (state.initializing) {
      throw new Error("Application initialization is already in progress.");
    }

    state.initializing = true;
    state.startTime = Date.now();

    try {
      log("Starting bootstrap process.");

      const config = await loadConfiguration();

      if (
        !config ||
        typeof config !== "object" ||
        Array.isArray(config)
      ) {
        throw new Error("Application configuration is invalid.");
      }

      publishConfiguration(config);

      await initializeRouter();
      await initializeEvents();
      await initializeLifecycle();

      state.initialized = true;

      document.documentElement.classList.add("app-initialized");

      document.dispatchEvent(
        new CustomEvent("snake:app-ready", {
          detail: {
            config: window.SnakeAppConfig,
            duration: Date.now() - state.startTime
          }
        })
      );

      log("Bootstrap completed successfully.");

      return window.SnakeApp;
    } catch (error) {
      reportError("Application bootstrap failed.", error);
      throw error;
    } finally {
      state.initializing = false;
    }
  }

  /**
   * Return the current bootstrap status.
   */
  function getStatus() {
    return {
      initialized: state.initialized,
      initializing: state.initializing,
      startTime: state.startTime,
      configLoaded: state.config !== null
    };
  }

  /**
   * Expose the public application API.
   */
  window[APP_NAMESPACE] = Object.assign(
    window[APP_NAMESPACE] || {},
    {
      bootstrap,
      getStatus
    }
  );
})(window, document);