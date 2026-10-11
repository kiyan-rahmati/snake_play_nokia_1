/**
 * Snake Nokia V2
 * Main application entry point
 *
 * This file starts the application bootstrap process.
 * Feature modules are initialized by the app bootstrap layer.
 */

(function () {
  "use strict";

  const APP_NAME = "Snake Nokia V2";
  const APP_VERSION = "2.0.0";

  let started = false;

  /**
   * Write a startup message to the browser console.
   */
  function logStartup() {
    console.info(
      `%c${APP_NAME} v${APP_VERSION}`,
      "color: #00f5d4; font-weight: bold; font-size: 14px;"
    );

    console.info("Initializing application...");
  }

  /**
   * Start the application.
   */
  async function startApplication() {
    if (started) {
      return;
    }

    started = true;
    logStartup();

    try {
      if (
        !window.SnakeApp ||
        typeof window.SnakeApp.bootstrap !== "function"
      ) {
        throw new Error(
          "Application bootstrap is unavailable. Check js/app/app-bootstrap.js."
        );
      }

      await window.SnakeApp.bootstrap();

      console.info(`${APP_NAME} started successfully.`);
    } catch (error) {
      started = false;

      console.error("Failed to start the application:", error);

      document.dispatchEvent(
        new CustomEvent("snake:startup-error", {
          detail: {
            message:
              error instanceof Error
                ? error.message
                : "An unexpected startup error occurred."
          }
        })
      );
    }
  }

  /**
   * Start after the HTML document is ready.
   */
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startApplication,
      { once: true }
    );
  } else {
    startApplication();
  }

  /**
   * Expose basic application information for debugging.
   */
  window.SnakeAppInfo = Object.freeze({
    name: APP_NAME,
    version: APP_VERSION,
    get started() {
      return started;
    }
  });
})();