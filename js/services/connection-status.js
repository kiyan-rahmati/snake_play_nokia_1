(function (global) {
  "use strict";

  const ConnectionStatus = {
    initialized: false,
    online: typeof navigator !== "undefined"
      ? navigator.onLine
      : true,
    listeners: new Set(),
    connection: null,
    checkTimer: null,
    options: {
      checkInterval: 30000,
      enableConnectionHints: true
    },

    init(options) {
      if (this.initialized) return this;

      options = options || {};

      this.options = Object.assign({}, this.options, options);

      this.options.checkInterval = Math.max(
        5000,
        Number(this.options.checkInterval) || 30000
      );

      this.online = typeof navigator !== "undefined"
        ? navigator.onLine
        : true;

      this.handleOnline = () => {
        this.updateStatus(true, "browser-online-event");
      };

      this.handleOffline = () => {
        this.updateStatus(false, "browser-offline-event");
      };

      global.addEventListener("online", this.handleOnline);
      global.addEventListener("offline", this.handleOffline);

      if (this.options.enableConnectionHints) {
        this.connection =
          navigator.connection ||
          navigator.mozConnection ||
          navigator.webkitConnection ||
          null;

        if (this.connection) {
          this.handleConnectionChange = () => {
            this.emit("connection:quality-changed", {
              effectiveType: this.connection.effectiveType || null,
              downlink: Number.isFinite(this.connection.downlink)
                ? this.connection.downlink
                : null,
              rtt: Number.isFinite(this.connection.rtt)
                ? this.connection.rtt
                : null,
              saveData: Boolean(this.connection.saveData)
            });
          };

          this.connection.addEventListener(
            "change",
            this.handleConnectionChange
          );
        }
      }

      this.initialized = true;

      this.emit("connection:initialized", {
        online: this.online
      });

      return this;
    },

    isOnline() {
      return this.online;
    },

    getStatus() {
      return {
        online: this.online,
        effectiveType: this.connection
          ? this.connection.effectiveType || null
          : null,
        downlink: this.connection &&
          Number.isFinite(this.connection.downlink)
          ? this.connection.downlink
          : null,
        rtt: this.connection &&
          Number.isFinite(this.connection.rtt)
          ? this.connection.rtt
          : null,
        saveData: Boolean(
          this.connection && this.connection.saveData
        )
      };
    },

    updateStatus(online, reason) {
      const nextStatus = Boolean(online);

      if (this.online === nextStatus) return false;

      const previousStatus = this.online;
      this.online = nextStatus;

      this.emit(
        nextStatus ? "connection:online" : "connection:offline",
        {
          online: nextStatus,
          previousOnline: previousStatus,
          reason: reason || "status-update"
        }
      );

      this.emit("connection:status-changed", {
        online: nextStatus,
        previousOnline: previousStatus,
        reason: reason || "status-update"
      });

      return true;
    },

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError(
          "Connection status listener must be a function."
        );
      }

      this.listeners.add(listener);

      return () => {
        this.listeners.delete(listener);
      };
    },

    async checkReachability(url, options) {
      options = options || {};

      if (typeof global.fetch !== "function") {
        return {
          reachable: false,
          online: this.online,
          reason: "fetch-unavailable"
        };
      }

      const target = url || options.url;

      if (!target || typeof target !== "string") {
        return {
          reachable: false,
          online: this.online,
          reason: "missing-url"
        };
      }

      const timeout = Math.max(
        1000,
        Number(options.timeout) || 5000
      );

      const controller =
        typeof global.AbortController === "function"
          ? new global.AbortController()
          : null;

      let timer = null;

      try {
        const timeoutPromise = new Promise((_, reject) => {
          timer = global.setTimeout(() => {
            if (controller) controller.abort();

            const error = new Error("Reachability check timed out.");
            error.name = "TimeoutError";
            reject(error);
          }, timeout);
        });

        const fetchPromise = global.fetch(target, {
          method: "HEAD",
          cache: "no-store",
          mode: options.mode || "no-cors",
          signal: controller ? controller.signal : undefined
        });

        const response = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]);

        const reachable =
          response.type === "opaque" ||
          response.ok ||
          response.status > 0;

        return {
          reachable,
          online: this.online,
          status: response.status || null,
          reason: reachable ? "response-received" : "no-response"
        };
      } catch (error) {
        return {
          reachable: false,
          online: this.online,
          reason: error && error.name === "TimeoutError"
            ? "timeout"
            : error && error.name === "AbortError"
              ? "aborted"
              : "network-error"
        };
      } finally {
        if (timer !== null) {
          global.clearTimeout(timer);
        }
      }
    },

    startMonitoring(callback) {
      this.stopMonitoring();

      const listener = async () => {
        if (typeof callback === "function") {
          callback(this.getStatus());
        }
      };

      this.monitoringListener = listener;

      listener();

      this.checkTimer = global.setInterval(
        listener,
        this.options.checkInterval
      );

      return () => this.stopMonitoring();
    },

    stopMonitoring() {
      if (this.checkTimer !== null) {
        global.clearInterval(this.checkTimer);
        this.checkTimer = null;
      }

      this.monitoringListener = null;
    },

    emit(eventName, detail) {
      const payload = Object.assign(
        {
          timestamp: Date.now()
        },
        detail || {}
      );

      this.listeners.forEach((listener) => {
        try {
          listener({
            type: eventName,
            detail: payload
          });
        } catch (error) {
          if (
            global.console &&
            typeof global.console.error === "function"
          ) {
            global.console.error(
              "[ConnectionStatus] Listener error:",
              error
            );
          }
        }
      });

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit(eventName, payload);
      }

      if (typeof global.CustomEvent === "function") {
        global.dispatchEvent(
          new CustomEvent(eventName, {
            detail: payload
          })
        );
      }
    },

    destroy() {
      if (!this.initialized) return;

      global.removeEventListener("online", this.handleOnline);
      global.removeEventListener("offline", this.handleOffline);

      if (
        this.connection &&
        this.handleConnectionChange
      ) {
        this.connection.removeEventListener(
          "change",
          this.handleConnectionChange
        );
      }

      this.stopMonitoring();
      this.listeners.clear();

      this.connection = null;
      this.handleOnline = null;
      this.handleOffline = null;
      this.handleConnectionChange = null;
      this.initialized = false;
    }
  };

  global.SnakeConnectionStatus = ConnectionStatus;
})(window);