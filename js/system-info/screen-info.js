(function (global) {
  "use strict";

  class SnakeScreenInfo {
    constructor(options) {
      const settings = options || {};

      this.window = settings.window || global;
      this.document = settings.document || this.window.document || null;
      this.cachedInfo = null;
      this.listeners = new Set();
      this.observers = [];
      this.initialized = false;
      this.destroyed = false;
      this.debounceTimer = null;
      this.debounceDelay = Math.max(
        0,
        Number(settings.debounceDelay ?? 150)
      );

      this._handleResize = this._handleResize.bind(this);
      this._handleOrientationChange =
        this._handleOrientationChange.bind(this);
      this._handleVisibilityChange =
        this._handleVisibilityChange.bind(this);
    }

    initialize() {
      this._assertAlive();

      if (this.initialized) {
        return this.getInfo();
      }

      this.window.addEventListener("resize", this._handleResize, {
        passive: true
      });

      this.window.addEventListener(
        "orientationchange",
        this._handleOrientationChange,
        { passive: true }
      );

      if (this.document) {
        this.document.addEventListener(
          "visibilitychange",
          this._handleVisibilityChange
        );
      }

      if (typeof this.window.matchMedia === "function") {
        this._observeMediaQuery("(orientation: portrait)", "portrait");
        this._observeMediaQuery("(orientation: landscape)", "landscape");
      }

      this.initialized = true;
      this.cachedInfo = this._collect();

      this._emit("initialized", this.getInfo());

      return this.getInfo();
    }

    getInfo(options) {
      this._assertAlive();

      const settings = options || {};

      if (settings.refresh || !this.cachedInfo) {
        this.cachedInfo = this._collect();
      }

      return this._clone(this.cachedInfo);
    }

    refresh() {
      this._assertAlive();

      const previous = this.cachedInfo;
      const next = this._collect();

      this.cachedInfo = next;

      this._emit("refreshed", {
        previous: this._clone(previous),
        current: this.getInfo()
      });

      return this.getInfo();
    }

    getDimensions() {
      const info = this.getInfo();

      return {
        screen: {
          width: info.width,
          height: info.height
        },
        available: {
          width: info.availableWidth,
          height: info.availableHeight
        },
        viewport: {
          width: info.viewportWidth,
          height: info.viewportHeight
        },
        document: {
          width: info.documentWidth,
          height: info.documentHeight
        }
      };
    }

    getOrientation() {
      return this.getInfo().orientation;
    }

    getPixelRatio() {
      return this.getInfo().pixelRatio;
    }

    isPortrait() {
      return this.getOrientation() === "portrait";
    }

    isLandscape() {
      return this.getOrientation() === "landscape";
    }

    isSmallScreen() {
      const info = this.getInfo();

      return Math.min(info.viewportWidth, info.viewportHeight) < 600;
    }

    isTouchDevice() {
      return this.getInfo().touchSupported;
    }

    getBreakpoint() {
      const width = this.getInfo().viewportWidth;

      if (width < 480) return "xs";
      if (width < 768) return "sm";
      if (width < 1024) return "md";
      if (width < 1280) return "lg";

      return "xl";
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

    _collect() {
      const screenRef = this.window.screen || {};
      const visualViewport = this.window.visualViewport || null;
      const documentElement = this.document
        ? this.document.documentElement
        : null;

      const width = Number(screenRef.width || 0);
      const height = Number(screenRef.height || 0);
      const viewportWidth = Number(this.window.innerWidth || 0);
      const viewportHeight = Number(this.window.innerHeight || 0);

      return {
        width,
        height,
        availableWidth: Number(screenRef.availWidth || 0),
        availableHeight: Number(screenRef.availHeight || 0),
        colorDepth: Number(screenRef.colorDepth || 0),
        pixelDepth: Number(screenRef.pixelDepth || 0),
        pixelRatio: Number(this.window.devicePixelRatio || 1),

        viewportWidth,
        viewportHeight,

        documentWidth: documentElement
          ? Math.max(
              Number(documentElement.scrollWidth || 0),
              viewportWidth
            )
          : viewportWidth,

        documentHeight: documentElement
          ? Math.max(
              Number(documentElement.scrollHeight || 0),
              viewportHeight
            )
          : viewportHeight,

        orientation: this._getOrientation(width, height),

        orientationAngle: this._getOrientationAngle(),

        visualViewport: visualViewport
          ? {
              width: Number(visualViewport.width || 0),
              height: Number(visualViewport.height || 0),
              scale: Number(visualViewport.scale || 1),
              offsetLeft: Number(visualViewport.offsetLeft || 0),
              offsetTop: Number(visualViewport.offsetTop || 0),
              pageLeft: Number(visualViewport.pageLeft || 0),
              pageTop: Number(visualViewport.pageTop || 0)
            }
          : null,

        touchSupported: this._supportsTouch(),

        maxTouchPoints: Number(
          (this.window.navigator &&
            this.window.navigator.maxTouchPoints) || 0
        ),

        devicePixelRatio: Number(this.window.devicePixelRatio || 1),

        media: {
          prefersDarkMode: this._matchesMedia(
            "(prefers-color-scheme: dark)"
          ),
          prefersReducedMotion: this._matchesMedia(
            "(prefers-reduced-motion: reduce)"
          ),
          prefersContrast: this._matchesMedia(
            "(prefers-contrast: more)"
          ),
          coarsePointer: this._matchesMedia("(pointer: coarse)"),
          finePointer: this._matchesMedia("(pointer: fine)"),
          hoverSupported: this._matchesMedia("(hover: hover)")
        },

        visibilityState: this.document
          ? this.document.visibilityState || "unknown"
          : "unknown",

        isSecureContext: Boolean(this.window.isSecureContext),

        collectedAt: new Date().toISOString()
      };
    }

    _getOrientation(width, height) {
      const screenRef = this.window.screen || {};

      if (
        screenRef.orientation &&
        typeof screenRef.orientation.type === "string"
      ) {
        return screenRef.orientation.type.startsWith("portrait")
          ? "portrait"
          : "landscape";
      }

      if (!width || !height) {
        return "unknown";
      }

      const viewportWidth = Number(this.window.innerWidth || 0);
      const viewportHeight = Number(this.window.innerHeight || 0);

      if (viewportWidth && viewportHeight) {
        return viewportWidth >= viewportHeight
          ? "landscape"
          : "portrait";
      }

      return width >= height ? "landscape" : "portrait";
    }

    _getOrientationAngle() {
      const screenRef = this.window.screen || {};

      if (
        screenRef.orientation &&
        Number.isFinite(Number(screenRef.orientation.angle))
      ) {
        return Number(screenRef.orientation.angle);
      }

      if (Number.isFinite(Number(this.window.orientation))) {
        return Number(this.window.orientation);
      }

      return null;
    }

    _supportsTouch() {
      const navigatorRef = this.window.navigator || {};

      return (
        "ontouchstart" in this.window ||
        Number(navigatorRef.maxTouchPoints || 0) > 0
      );
    }

    _matchesMedia(query) {
      try {
        return typeof this.window.matchMedia === "function"
          ? this.window.matchMedia(query).matches
          : false;
      } catch (_) {
        return false;
      }
    }

    _observeMediaQuery(query, label) {
      try {
        const mediaQuery = this.window.matchMedia(query);

        const handler = () => {
          this._scheduleRefresh("media:" + label);
        };

        if (typeof mediaQuery.addEventListener === "function") {
          mediaQuery.addEventListener("change", handler);
          this.observers.push(() => {
            mediaQuery.removeEventListener("change", handler);
          });
        } else if (typeof mediaQuery.addListener === "function") {
          mediaQuery.addListener(handler);
          this.observers.push(() => {
            mediaQuery.removeListener(handler);
          });
        }
      } catch (_) {
        // Media queries are optional.
      }
    }

    _handleResize() {
      this._scheduleRefresh("resize");
    }

    _handleOrientationChange() {
      this._scheduleRefresh("orientationchange");
    }

    _handleVisibilityChange() {
      if (this.document &&
          this.document.visibilityState === "visible") {
        this._scheduleRefresh("visibilitychange");
      }
    }

    _scheduleRefresh(reason) {
      if (this.destroyed) {
        return;
      }

      if (this.debounceTimer !== null) {
        this.window.clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = this.window.setTimeout(() => {
        this.debounceTimer = null;

        if (this.destroyed) {
          return;
        }

        const previous = this.cachedInfo;
        const current = this._collect();

        if (this._equalRelevantInfo(previous, current)) {
          this.cachedInfo = current;
          return;
        }

        this.cachedInfo = current;

        this._emit("changed", {
          reason,
          previous: this._clone(previous),
          current: this.getInfo()
        });
      }, this.debounceDelay);
    }

    _equalRelevantInfo(first, second) {
      if (!first || !second) {
        return false;
      }

      const keys = [
        "width",
        "height",
        "availableWidth",
        "availableHeight",
        "viewportWidth",
        "viewportHeight",
        "pixelRatio",
        "orientation",
        "orientationAngle",
        "touchSupported",
        "maxTouchPoints"
      ];

      for (const key of keys) {
        if (first[key] !== second[key]) {
          return false;
        }
      }

      const firstViewport = first.visualViewport;
      const secondViewport = second.visualViewport;

      if (Boolean(firstViewport) !== Boolean(secondViewport)) {
        return false;
      }

      if (firstViewport && secondViewport) {
        const viewportKeys = [
          "width",
          "height",
          "scale",
          "offsetLeft",
          "offsetTop"
        ];

        for (const key of viewportKeys) {
          if (firstViewport[key] !== secondViewport[key]) {
            return false;
          }
        }
      }

      return JSON.stringify(first.media) === JSON.stringify(second.media);
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
          if (
            this.window.console &&
            typeof this.window.console.error === "function"
          ) {
            this.window.console.error(
              "Screen info listener failed.",
              error
            );
          }
        }
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeScreenInfo has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.initialized) {
        this.window.removeEventListener(
          "resize",
          this._handleResize
        );

        this.window.removeEventListener(
          "orientationchange",
          this._handleOrientationChange
        );

        if (this.document) {
          this.document.removeEventListener(
            "visibilitychange",
            this._handleVisibilityChange
          );
        }
      }

      for (const cleanup of this.observers) {
        try {
          cleanup();
        } catch (_) {}
      }

      this.observers = [];

      if (this.debounceTimer !== null) {
        this.window.clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      this.listeners.clear();
      this.cachedInfo = null;
      this.initialized = false;
      this.destroyed = true;
    }
  }

  global.SnakeScreenInfo = SnakeScreenInfo;
})(window);