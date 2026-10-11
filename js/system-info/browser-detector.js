(function (global) {
  "use strict";

  class SnakeBrowserDetector {
    constructor(options) {
      const settings = options || {};

      this.navigator = settings.navigator || global.navigator || {};
      this.window = settings.window || global;
      this.cachedInfo = null;
      this.listeners = new Set();
      this.destroyed = false;
    }

    detect(options) {
      this._assertAlive();

      const settings = options || {};

      if (this.cachedInfo && !settings.force) {
        return this.getInfo();
      }

      const userAgent = String(this.navigator.userAgent || "");
      const userAgentData = this.navigator.userAgentData || null;
      const browserInfo = this._identifyBrowser(userAgent);

      const info = {
        name: browserInfo.name,
        version: browserInfo.version,
        majorVersion: browserInfo.majorVersion,
        engine: this._identifyEngine(userAgent, browserInfo.name),
        userAgent: userAgent || null,
        language: this.navigator.language || null,
        languages: Array.isArray(this.navigator.languages)
          ? [...this.navigator.languages]
          : [],
        cookiesEnabled: typeof this.navigator.cookieEnabled === "boolean"
          ? this.navigator.cookieEnabled
          : null,
        online: typeof this.navigator.onLine === "boolean"
          ? this.navigator.onLine
          : null,
        pdfViewerEnabled: typeof this.navigator.pdfViewerEnabled === "boolean"
          ? this.navigator.pdfViewerEnabled
          : null,
        vendor: this.navigator.vendor || null,
        userAgentData: userAgentData
          ? {
              mobile: typeof userAgentData.mobile === "boolean"
                ? userAgentData.mobile
                : null,
              platform: userAgentData.platform || null,
              brands: Array.isArray(userAgentData.brands)
                ? userAgentData.brands.map((brand) => ({
                    brand: String(brand.brand || ""),
                    version: String(brand.version || "")
                  }))
                : []
            }
          : null,
        features: this._detectFeatures(),
        detectedAt: new Date().toISOString()
      };

      this.cachedInfo = info;
      this._emit("detected", this.getInfo());

      return this.getInfo();
    }

    getInfo() {
      this._assertAlive();

      if (!this.cachedInfo) {
        return this.detect();
      }

      return this._clone(this.cachedInfo);
    }

    getName() {
      return this.getInfo().name;
    }

    getVersion() {
      return this.getInfo().version;
    }

    getEngine() {
      return this.getInfo().engine;
    }

    is(name) {
      const info = this.getInfo();
      const normalized = String(name || "").trim().toLowerCase();

      if (!normalized) {
        return false;
      }

      return info.name.toLowerCase() === normalized;
    }

    isChromiumBased() {
      const engine = this.getEngine();

      return engine === "Blink" || engine === "Chromium";
    }

    isMobileBrowser() {
      const info = this.getInfo();
      const userAgentData = info.userAgentData;

      if (userAgentData && typeof userAgentData.mobile === "boolean") {
        return userAgentData.mobile;
      }

      return /Android|iPhone|iPod|Mobile|Windows Phone/i.test(
        info.userAgent || ""
      );
    }

    supports(feature) {
      const features = this.getInfo().features;
      const key = String(feature || "");

      return Object.prototype.hasOwnProperty.call(features, key)
        ? features[key] === true
        : false;
    }

    async getHighEntropyInfo(hints) {
      this._assertAlive();

      const userAgentData = this.navigator.userAgentData;

      if (
        !userAgentData ||
        typeof userAgentData.getHighEntropyValues !== "function"
      ) {
        return null;
      }

      const allowedHints = [
        "architecture",
        "bitness",
        "model",
        "platformVersion",
        "uaFullVersion",
        "fullVersionList",
        "wow64"
      ];

      const requestedHints = Array.isArray(hints)
        ? [...new Set(hints)].filter((hint) => allowedHints.includes(hint))
        : ["architecture", "bitness", "platformVersion"];

      if (requestedHints.length === 0) {
        return null;
      }

      try {
        const result = await userAgentData.getHighEntropyValues(requestedHints);

        this._emit("high-entropy-info", {
          requestedHints
        });

        return this._clone(result);
      } catch (error) {
        this._emit("error", {
          operation: "getHighEntropyInfo",
          message: error && error.message
            ? error.message
            : "Unable to retrieve browser details."
        });

        return null;
      }
    }

    subscribe(listener) {
      this._assertAlive();

      if (typeof listener !== "function") {
        throw new TypeError("Listener must be a function.");
      }

      this.listeners.add(listener);

      return () => {
        this.listeners.delete(listener);
      };
    }

    clearCache() {
      this._assertAlive();
      this.cachedInfo = null;
      this._emit("cache-cleared", {});
    }

    _identifyBrowser(userAgent) {
      const patterns = [
        {
          name: "Microsoft Edge",
          pattern: /(?:EdgA|EdgiOS|Edg)\/([\d.]+)/i
        },
        {
          name: "Opera",
          pattern: /(?:OPR|Opera)\/([\d.]+)/i
        },
        {
          name: "Samsung Internet",
          pattern: /SamsungBrowser\/([\d.]+)/i
        },
        {
          name: "Firefox",
          pattern: /(?:Firefox|FxiOS)\/([\d.]+)/i
        },
        {
          name: "Chrome",
          pattern: /(?:CriOS|Chrome)\/([\d.]+)/i
        },
        {
          name: "Internet Explorer",
          pattern: /(?:MSIE\s|rv:)([\d.]+).*Trident/i
        },
        {
          name: "Safari",
          pattern: /Version\/([\d.]+).*Safari/i
        }
      ];

      for (const entry of patterns) {
        const match = userAgent.match(entry.pattern);

        if (match) {
          const version = match[1];

          return {
            name: entry.name,
            version,
            majorVersion: this._majorVersion(version)
          };
        }
      }

      if (/Trident/i.test(userAgent)) {
        return {
          name: "Internet Explorer",
          version: null,
          majorVersion: null
        };
      }

      return {
        name: "Unknown",
        version: null,
        majorVersion: null
      };
    }

    _identifyEngine(userAgent, browserName) {
      if (/Trident/i.test(userAgent)) {
        return "Trident";
      }

      if (/Edge\/|Edg\//i.test(userAgent)) {
        return "Blink";
      }

      if (/OPR\//i.test(userAgent)) {
        return "Blink";
      }

      if (/Firefox\/|FxiOS\//i.test(userAgent)) {
        return "Gecko";
      }

      if (/AppleWebKit/i.test(userAgent)) {
        if (/Chrome\/|CriOS\/|Chromium/i.test(userAgent)) {
          return "Blink";
        }

        return "WebKit";
      }

      if (browserName === "Internet Explorer") {
        return "Trident";
      }

      return "Unknown";
    }

    _detectFeatures() {
      const documentRef = this.window.document || null;

      return {
        localStorage: this._canUseStorage("localStorage"),
        sessionStorage: this._canUseStorage("sessionStorage"),
        serviceWorker: Boolean(
          this.navigator.serviceWorker &&
          typeof this.navigator.serviceWorker.register === "function"
        ),
        webAudio: Boolean(
          this.window.AudioContext ||
          this.window.webkitAudioContext
        ),
        canvas: this._supportsCanvas(documentRef),
        webGL: this._supportsWebGL(documentRef),
        webSocket: typeof this.window.WebSocket === "function",
        fetch: typeof this.window.fetch === "function",
        promises: typeof this.window.Promise === "function",
        intersectionObserver:
          typeof this.window.IntersectionObserver === "function",
        resizeObserver:
          typeof this.window.ResizeObserver === "function",
        touchEvents: "ontouchstart" in this.window,
        pointerEvents: typeof this.window.PointerEvent === "function",
        fullscreen:
          Boolean(documentRef) &&
          (
            "fullscreenEnabled" in documentRef ||
            "webkitFullscreenEnabled" in documentRef
          ),
        reducedMotionQuery: this._supportsMediaQuery(
          "(prefers-reduced-motion: reduce)"
        )
      };
    }

    _canUseStorage(name) {
      try {
        const storage = this.window[name];

        if (!storage) {
          return false;
        }

        const testKey = "__snake_storage_test__";

        storage.setItem(testKey, "1");
        storage.removeItem(testKey);

        return true;
      } catch (_) {
        return false;
      }
    }

    _supportsCanvas(documentRef) {
      if (!documentRef || typeof documentRef.createElement !== "function") {
        return false;
      }

      try {
        const canvas = documentRef.createElement("canvas");

        return Boolean(
          canvas &&
          typeof canvas.getContext === "function" &&
          canvas.getContext("2d")
        );
      } catch (_) {
        return false;
      }
    }

    _supportsWebGL(documentRef) {
      if (!documentRef || typeof documentRef.createElement !== "function") {
        return false;
      }

      try {
        const canvas = documentRef.createElement("canvas");

        return Boolean(
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl")
        );
      } catch (_) {
        return false;
      }
    }

    _supportsMediaQuery(query) {
      try {
        return typeof this.window.matchMedia === "function" &&
          this.window.matchMedia(query).matches;
      } catch (_) {
        return false;
      }
    }

    _majorVersion(version) {
      if (!version) {
        return null;
      }

      const value = Number.parseInt(String(version).split(".")[0], 10);

      return Number.isFinite(value) ? value : null;
    }

    _clone(value) {
      if (value === null || value === undefined) {
        return value;
      }

      if (typeof this.window.structuredClone === "function") {
        try {
          return this.window.structuredClone(value);
        } catch (_) {}
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
          if (this.window.console &&
              typeof this.window.console.error === "function") {
            this.window.console.error(
              "Browser detector listener failed.",
              error
            );
          }
        }
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeBrowserDetector has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.cachedInfo = null;
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeBrowserDetector = SnakeBrowserDetector;
})(window);