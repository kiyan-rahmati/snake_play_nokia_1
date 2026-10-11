(function (global) {
  "use strict";

  class SnakeDeviceDetector {
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
      const screenRef = this.window.screen || {};

      this.cachedInfo = {
        type: this._detectDeviceType(userAgent, userAgentData),
        mobile: this._isMobile(userAgent, userAgentData),
        tablet: this._isTablet(userAgent, userAgentData),
        desktop: this._isDesktop(userAgent, userAgentData),
        touchSupported: this._supportsTouch(),
        touchPoints: this._getTouchPoints(),
        manufacturer: this._detectManufacturer(userAgent),
        model: this._detectModel(userAgent, userAgentData),
        platform: userAgentData && userAgentData.platform
          ? userAgentData.platform
          : this.navigator.platform || null,
        screen: {
          width: Number(screenRef.width || 0),
          height: Number(screenRef.height || 0),
          pixelRatio: Number(this.window.devicePixelRatio || 1),
          orientation: this._getOrientation()
        },
        hardware: {
          logicalProcessors: this._positiveNumber(
            this.navigator.hardwareConcurrency
          ),
          memoryGB: this._positiveNumber(this.navigator.deviceMemory),
          maxTouchPoints: this._getTouchPoints()
        },
        capabilities: {
          pointerEvents: typeof this.window.PointerEvent === "function",
          touchEvents: "ontouchstart" in this.window,
          vibration: typeof this.navigator.vibrate === "function",
          gamepad: typeof this.navigator.getGamepads === "function",
          bluetooth: Boolean(this.navigator.bluetooth),
          usb: Boolean(this.navigator.usb),
          batteryApi: typeof this.navigator.getBattery === "function"
        },
        detectedAt: new Date().toISOString()
      };

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

    getType() {
      return this.getInfo().type;
    }

    isMobile() {
      return this.getInfo().mobile;
    }

    isTablet() {
      return this.getInfo().tablet;
    }

    isDesktop() {
      return this.getInfo().desktop;
    }

    getScreenInfo() {
      return this.getInfo().screen;
    }

    getHardwareInfo() {
      return this.getInfo().hardware;
    }

    supports(capability) {
      const capabilities = this.getInfo().capabilities;

      return Object.prototype.hasOwnProperty.call(
        capabilities,
        capability
      ) && capabilities[capability] === true;
    }

    async getBatteryInfo() {
      this._assertAlive();

      if (typeof this.navigator.getBattery !== "function") {
        return null;
      }

      try {
        const battery = await this.navigator.getBattery();

        return {
          charging: Boolean(battery.charging),
          level: Number.isFinite(battery.level)
            ? battery.level
            : null,
          chargingTime: Number.isFinite(battery.chargingTime)
            ? battery.chargingTime
            : null,
          dischargingTime: Number.isFinite(battery.dischargingTime)
            ? battery.dischargingTime
            : null
        };
      } catch (error) {
        this._emit("error", {
          operation: "getBatteryInfo",
          message: error && error.message
            ? error.message
            : "Unable to retrieve battery information."
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

    _detectDeviceType(userAgent, userAgentData) {
      if (this._isTablet(userAgent, userAgentData)) {
        return "tablet";
      }

      if (this._isMobile(userAgent, userAgentData)) {
        return "mobile";
      }

      return "desktop";
    }

    _isMobile(userAgent, userAgentData) {
      if (userAgentData && typeof userAgentData.mobile === "boolean") {
        return userAgentData.mobile &&
          !/iPad|Tablet/i.test(String(userAgent || ""));
      }

      const ua = String(userAgent || "");

      if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
        return false;
      }

      return /Android.*Mobile|iPhone|iPod|Windows Phone|Mobile/i.test(ua);
    }

    _isTablet(userAgent, userAgentData) {
      const ua = String(userAgent || "");

      if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
        return true;
      }

      if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
        return true;
      }

      if (
        userAgentData &&
        typeof userAgentData.mobile === "boolean" &&
        userAgentData.mobile === false &&
        /Android/i.test(String(userAgentData.platform || ""))
      ) {
        return true;
      }

      return false;
    }

    _isDesktop(userAgent, userAgentData) {
      return !this._isMobile(userAgent, userAgentData) &&
        !this._isTablet(userAgent, userAgentData);
    }

    _detectManufacturer(userAgent) {
      const ua = String(userAgent || "");

      const manufacturers = [
        ["Apple", /iPhone|iPad|iPod|Macintosh/i],
        ["Samsung", /Samsung|SM-[A-Z0-9]+/i],
        ["Google", /Pixel|Google Pixel/i],
        ["Huawei", /Huawei|Honor/i],
        ["Xiaomi", /Xiaomi|Redmi|POCO|Mi\s/i],
        ["OnePlus", /OnePlus/i],
        ["Motorola", /Motorola|Moto\s/i],
        ["Sony", /Sony|Xperia/i],
        ["LG", /LG-[A-Z0-9]+|LG Electronics/i],
        ["Microsoft", /Surface|Windows Phone/i]
      ];

      for (const [manufacturer, pattern] of manufacturers) {
        if (pattern.test(ua)) {
          return manufacturer;
        }
      }

      return null;
    }

    _detectModel(userAgent, userAgentData) {
      if (userAgentData && userAgentData.model) {
        return String(userAgentData.model);
      }

      const ua = String(userAgent || "");

      const androidModel = ua.match(
        /Android[^;)]*;\s*(?:[^;)]*;\s*)?([^;)]+?)(?:\s+Build\/[^;)]+)?\s*\)/i
      );

      if (androidModel && androidModel[1]) {
        const model = androidModel[1].trim();

        if (
          model &&
          !/^(?:Linux|Android|U|wv|Mobile|Tablet|K|en-us)$/i.test(model)
        ) {
          return model;
        }
      }

      if (/iPhone/i.test(ua)) {
        return "iPhone";
      }

      if (/iPad/i.test(ua)) {
        return "iPad";
      }

      if (/iPod/i.test(ua)) {
        return "iPod";
      }

      return null;
    }

    _supportsTouch() {
      return (
        "ontouchstart" in this.window ||
        Number(this.navigator.maxTouchPoints || 0) > 0
      );
    }

    _getTouchPoints() {
      const points = Number(this.navigator.maxTouchPoints || 0);

      return Number.isFinite(points) && points > 0 ? points : 0;
    }

    _getOrientation() {
      const screenRef = this.window.screen || {};

      if (
        screenRef.orientation &&
        typeof screenRef.orientation.type === "string"
      ) {
        return screenRef.orientation.type;
      }

      const width = Number(this.window.innerWidth || 0);
      const height = Number(this.window.innerHeight || 0);

      if (!width || !height) {
        return "unknown";
      }

      return width >= height ? "landscape" : "portrait";
    }

    _positiveNumber(value) {
      const number = Number(value);

      return Number.isFinite(number) && number > 0
        ? number
        : null;
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
              "Device detector listener failed.",
              error
            );
          }
        }
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeDeviceDetector has been destroyed.");
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

  global.SnakeDeviceDetector = SnakeDeviceDetector;
})(window);