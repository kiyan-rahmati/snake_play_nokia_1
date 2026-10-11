(function (global) {
  "use strict";

  class SnakeSystemInfoController {
    constructor(options) {
      const settings = options || {};

      this.providers = settings.providers || {};
      this.cacheDuration = Math.max(0, Number(settings.cacheDuration ?? 60000));
      this.timeout = Math.max(1000, Number(settings.timeout ?? 10000));
      this.consentProvider = settings.consentProvider || null;

      this.cache = new Map();
      this.listeners = new Set();
      this.pendingRequests = new Map();
      this.abortControllers = new Set();

      this.initialized = false;
      this.destroyed = false;
      this.refreshing = false;

      this.snapshot = {
        status: "idle",
        collectedAt: null,
        data: {},
        errors: {}
      };

      this.allowedCategories = [
        "browser",
        "platform",
        "device",
        "screen"
      ];
    }

    initialize() {
      this._assertAlive();

      if (this.initialized) {
        return this.getSnapshot();
      }

      this.initialized = true;

      this._emit("initialized", {
        categories: [...this.allowedCategories]
      });

      return this.getSnapshot();
    }

    async collect(options) {
      this._assertAlive();

      if (!this.initialized) {
        this.initialize();
      }

      const settings = options || {};
      const requested = Array.isArray(settings.categories)
        ? settings.categories
        : this.allowedCategories;

      const categories = [...new Set(requested)].filter((category) =>
        this.allowedCategories.includes(category)
      );

      if (settings.includeNetwork || settings.includePublicIp) {
        this._emit("network-info-skipped", {
          reason: "Network identifiers require a separate explicit privacy flow."
        });
      }

      if (!this._hasConsent()) {
        this.snapshot = {
          status: "consent-required",
          collectedAt: null,
          data: {},
          errors: {}
        };

        this._emit("consent-required", {});
        return this.getSnapshot();
      }

      if (this.refreshing && !settings.force) {
        return this.getSnapshot();
      }

      this.refreshing = true;

      this.snapshot = {
        ...this.snapshot,
        status: "loading",
        errors: {}
      };

      this._emit("collection-started", {
        categories
      });

      const data = {};
      const errors = {};

      try {
        const results = await Promise.all(
          categories.map(async (category) => {
            try {
              const value = await this._collectCategory(
                category,
                Boolean(settings.force)
              );

              return {
                category,
                value
              };
            } catch (error) {
              return {
                category,
                error: this._serializeError(error)
              };
            }
          })
        );

        for (const result of results) {
          if (result.error) {
            errors[result.category] = result.error;
          } else {
            data[result.category] = result.value;
          }
        }

        this.snapshot = {
          status: Object.keys(errors).length === 0 ? "ready" : "partial",
          collectedAt: new Date().toISOString(),
          data,
          errors
        };

        this._emit("collection-completed", this.getSnapshot());

        return this.getSnapshot();
      } finally {
        this.refreshing = false;
      }
    }

    async refresh(options) {
      return this.collect({
        ...(options || {}),
        force: true
      });
    }

    async getCategory(category, options) {
      this._assertAlive();

      if (!this.allowedCategories.includes(category)) {
        throw new Error("Unsupported system information category: " + category);
      }

      if (!this.initialized) {
        this.initialize();
      }

      if (!this._hasConsent()) {
        throw new Error("Consent is required to collect system information.");
      }

      return this._collectCategory(category, Boolean(options && options.force));
    }

    getSnapshot() {
      return {
        status: this.snapshot.status,
        collectedAt: this.snapshot.collectedAt,
        data: this._clone(this.snapshot.data),
        errors: this._clone(this.snapshot.errors)
      };
    }

    getData(category) {
      if (category) {
        return this._clone(this.snapshot.data[category] ?? null);
      }

      return this._clone(this.snapshot.data);
    }

    getStatus() {
      return this.snapshot.status;
    }

    clearCache(category) {
      this._assertAlive();

      if (category) {
        this.cache.delete(category);
      } else {
        this.cache.clear();
      }

      this._emit("cache-cleared", {
        category: category || null
      });
    }

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener must be a function.");
      }

      this.listeners.add(listener);

      return () => {
        this.listeners.delete(listener);
      };
    }

    _hasConsent() {
      if (!this.consentProvider) {
        return true;
      }

      try {
        if (typeof this.consentProvider === "function") {
          return this.consentProvider() === true;
        }

        if (typeof this.consentProvider.hasConsent === "function") {
          return this.consentProvider.hasConsent() === true;
        }

        if (typeof this.consentProvider.isGranted === "function") {
          return this.consentProvider.isGranted() === true;
        }
      } catch (_) {
        return false;
      }

      return false;
    }

    async _collectCategory(category, force) {
      const now = Date.now();
      const cached = this.cache.get(category);

      if (
        !force &&
        cached &&
        now - cached.timestamp < this.cacheDuration
      ) {
        return this._clone(cached.value);
      }

      if (this.pendingRequests.has(category)) {
        return this.pendingRequests.get(category);
      }

      const request = this._withTimeout(
        this._invokeProvider(category),
        category
      )
        .then((value) => {
          const safeValue = this._sanitizeValue(value);

          this.cache.set(category, {
            timestamp: Date.now(),
            value: safeValue
          });

          return this._clone(safeValue);
        })
        .finally(() => {
          this.pendingRequests.delete(category);
        });

      this.pendingRequests.set(category, request);

      return request;
    }

    async _invokeProvider(category) {
      const provider = this.providers[category];

      if (typeof provider === "function") {
        return provider();
      }

      if (provider && typeof provider.collect === "function") {
        return provider.collect();
      }

      if (provider && typeof provider.getInfo === "function") {
        return provider.getInfo();
      }

      switch (category) {
        case "browser":
          return this._collectBrowserInfo();

        case "platform":
          return this._collectPlatformInfo();

        case "device":
          return this._collectDeviceInfo();

        case "screen":
          return this._collectScreenInfo();

        default:
          throw new Error("No provider for category: " + category);
      }
    }

    _collectBrowserInfo() {
      const navigatorRef = global.navigator || {};
      const userAgent = String(navigatorRef.userAgent || "");

      let browser = "unknown";
      let version = null;

      const patterns = [
        ["Firefox", /Firefox\/([\d.]+)/],
        ["Edge", /Edg\/([\d.]+)/],
        ["Opera", /(?:OPR|Opera)\/([\d.]+)/],
        ["Chrome", /Chrome\/([\d.]+)/],
        ["Safari", /Version\/([\d.]+).*Safari/]
      ];

      for (const [name, pattern] of patterns) {
        const match = userAgent.match(pattern);

        if (match) {
          browser = name;
          version = match[1];
          break;
        }
      }

      return {
        name: browser,
        version,
        language: navigatorRef.language || null,
        languages: Array.isArray(navigatorRef.languages)
          ? [...navigatorRef.languages]
          : [],
        cookieEnabled: Boolean(navigatorRef.cookieEnabled),
        online: typeof navigatorRef.onLine === "boolean"
          ? navigatorRef.onLine
          : null,
        userAgent: userAgent || null
      };
    }

    _collectPlatformInfo() {
      const navigatorRef = global.navigator || {};

      return {
        platform: navigatorRef.platform || null,
        language: navigatorRef.language || null,
        timezone: this._safeTimezone(),
        timezoneOffsetMinutes: new Date().getTimezoneOffset()
      };
    }

    _collectDeviceInfo() {
      const navigatorRef = global.navigator || {};
      const connection =
        navigatorRef.connection ||
        navigatorRef.mozConnection ||
        navigatorRef.webkitConnection ||
        null;

      return {
        mobile: this._isMobile(),
        touchSupported:
          "ontouchstart" in global ||
          Number(navigatorRef.maxTouchPoints || 0) > 0,
        maxTouchPoints: Number(navigatorRef.maxTouchPoints || 0),
        hardwareConcurrency: this._positiveNumber(
          navigatorRef.hardwareConcurrency
        ),
        deviceMemoryGB: this._positiveNumber(navigatorRef.deviceMemory),
        connection: connection
          ? {
              effectiveType: connection.effectiveType || null,
              downlinkMbps: this._positiveNumber(connection.downlink),
              saveData: Boolean(connection.saveData)
            }
          : null
      };
    }

    _collectScreenInfo() {
      const screenRef = global.screen || {};
      const visualViewport = global.visualViewport || null;

      return {
        width: Number(screenRef.width || 0),
        height: Number(screenRef.height || 0),
        availableWidth: Number(screenRef.availWidth || 0),
        availableHeight: Number(screenRef.availHeight || 0),
        colorDepth: Number(screenRef.colorDepth || 0),
        pixelRatio: Number(global.devicePixelRatio || 1),
        viewportWidth: Number(global.innerWidth || 0),
        viewportHeight: Number(global.innerHeight || 0),
        visualViewport: visualViewport
          ? {
              width: Number(visualViewport.width || 0),
              height: Number(visualViewport.height || 0),
              scale: Number(visualViewport.scale || 1)
            }
          : null
      };
    }

    _isMobile() {
      const navigatorRef = global.navigator || {};

      if (navigatorRef.userAgentData &&
          typeof navigatorRef.userAgentData.mobile === "boolean") {
        return navigatorRef.userAgentData.mobile;
      }

      return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(
        String(navigatorRef.userAgent || "")
      );
    }

    _safeTimezone() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
      } catch (_) {
        return null;
      }
    }

    _positiveNumber(value) {
      const number = Number(value);

      return Number.isFinite(number) && number > 0 ? number : null;
    }

    _withTimeout(promise, category) {
      let timerId;

      const timeoutPromise = new Promise((_, reject) => {
        timerId = global.setTimeout(() => {
          reject(new Error("System information collection timed out: " + category));
        }, this.timeout);
      });

      return Promise.race([promise, timeoutPromise]).finally(() => {
        global.clearTimeout(timerId);
      });
    }

    _sanitizeValue(value) {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value !== "object") {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map((item) => this._sanitizeValue(item));
      }

      const result = {};

      for (const [key, item] of Object.entries(value)) {
        if (typeof item === "function" || item === undefined) {
          continue;
        }

        result[key] = this._sanitizeValue(item);
      }

      return result;
    }

    _serializeError(error) {
      return {
        name: error && error.name ? String(error.name) : "Error",
        message: error && error.message
          ? String(error.message)
          : "Unknown system information error."
      };
    }

    _clone(value) {
      if (value === undefined) {
        return undefined;
      }

      if (typeof global.structuredClone === "function") {
        try {
          return global.structuredClone(value);
        } catch (_) {}
      }

      if (value === null || typeof value !== "object") {
        return value;
      }

      return JSON.parse(JSON.stringify(value));
    }

    _emit(type, detail) {
      const event = {
        type,
        detail,
        timestamp: Date.now()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error("System information listener failed.", error);
          }
        }
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeSystemInfoController has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      for (const controller of this.abortControllers) {
        try {
          controller.abort();
        } catch (_) {}
      }

      this.abortControllers.clear();
      this.pendingRequests.clear();
      this.cache.clear();
      this.listeners.clear();

      this.initialized = false;
      this.destroyed = true;
    }
  }

  global.SnakeSystemInfoController = SnakeSystemInfoController;
})(window);