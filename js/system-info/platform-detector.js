(function (global) {
  "use strict";

  class SnakePlatformDetector {
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

      const platformName = this._detectPlatform(userAgent, userAgentData);
      const operatingSystem = this._detectOperatingSystem(userAgent);
      const architecture = this._detectArchitecture(userAgent);

      this.cachedInfo = {
        name: platformName,
        operatingSystem,
        architecture,
        platform: this.navigator.platform || null,
        userAgentPlatform: userAgentData
          ? userAgentData.platform || null
          : null,
        mobile: this._isMobile(userAgent, userAgentData),
        touchSupported: this._supportsTouch(),
        language: this.navigator.language || null,
        languages: Array.isArray(this.navigator.languages)
          ? [...this.navigator.languages]
          : [],
        timezone: this._getTimezone(),
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        online: typeof this.navigator.onLine === "boolean"
          ? this.navigator.onLine
          : null,
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

    getName() {
      return this.getInfo().name;
    }

    getOperatingSystem() {
      return this.getInfo().operatingSystem;
    }

    getArchitecture() {
      return this.getInfo().architecture;
    }

    isWindows() {
      return this.getOperatingSystem().name === "Windows";
    }

    isMacOS() {
      return this.getOperatingSystem().name === "macOS";
    }

    isLinux() {
      return this.getOperatingSystem().name === "Linux";
    }

    isAndroid() {
      return this.getOperatingSystem().name === "Android";
    }

    isIOS() {
      return this.getOperatingSystem().name === "iOS";
    }

    isMobile() {
      return this.getInfo().mobile;
    }

    isDesktop() {
      const info = this.getInfo();

      return !info.mobile &&
        !["Android", "iOS"].includes(info.operatingSystem.name);
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

    _detectPlatform(userAgent, userAgentData) {
      if (userAgentData && userAgentData.platform) {
        const platform = userAgentData.platform.toLowerCase();

        if (platform.includes("windows")) return "Windows";
        if (platform.includes("mac")) return "macOS";
        if (platform.includes("chrome")) return "ChromeOS";
        if (platform.includes("android")) return "Android";
        if (platform.includes("ios")) return "iOS";
        if (platform.includes("linux")) return "Linux";
      }

      const os = this._detectOperatingSystem(userAgent);

      return os.name;
    }

    _detectOperatingSystem(userAgent) {
      const ua = String(userAgent || "");
      const platform = String(this.navigator.platform || "");

      if (/Windows Phone/i.test(ua)) {
        return {
          name: "Windows Phone",
          version: null
        };
      }

      if (/Android/i.test(ua)) {
        const match = ua.match(/Android\s+([\d.]+)/i);

        return {
          name: "Android",
          version: match ? match[1] : null
        };
      }

      if (/iPhone|iPad|iPod/i.test(ua)) {
        const match = ua.match(/OS\s([\d_]+)/i);

        return {
          name: "iOS",
          version: match ? match[1].replace(/_/g, ".") : null
        };
      }

      if (/CrOS/i.test(ua)) {
        const match = ua.match(/CrOS\s+\S+\s+([\d.]+)/i);

        return {
          name: "ChromeOS",
          version: match ? match[1] : null
        };
      }

      if (/Windows NT/i.test(ua) || /Win/i.test(platform)) {
        const match = ua.match(/Windows NT\s([\d.]+)/i);

        return {
          name: "Windows",
          version: match ? this._windowsVersion(match[1]) : null
        };
      }

      if (/Mac OS X|Macintosh/i.test(ua) || /Mac/i.test(platform)) {
        const match = ua.match(/Mac OS X\s?([\d_\.]+)/i);

        return {
          name: "macOS",
          version: match ? match[1].replace(/_/g, ".") : null
        };
      }

      if (/Linux/i.test(ua) || /Linux/i.test(platform)) {
        return {
          name: "Linux",
          version: null
        };
      }

      return {
        name: "Unknown",
        version: null
      };
    }

    _detectArchitecture(userAgent) {
      const platform = String(this.navigator.platform || "");
      const ua = String(userAgent || "");
      const uaPlatform = this.navigator.userAgentData
        ? String(this.navigator.userAgentData.platform || "")
        : "";

      if (/arm64|aarch64/i.test(ua)) {
        return "arm64";
      }

      if (/arm/i.test(ua)) {
        return "arm";
      }

      if (/x86_64|Win64|x64|amd64/i.test(ua)) {
        return "x64";
      }

      if (/i[3-6]86|x86/i.test(ua) || /i[3-6]86|x86/i.test(platform)) {
        return "x86";
      }

      if (/arm/i.test(platform)) {
        return "arm";
      }

      if (/arm/i.test(uaPlatform)) {
        return "arm";
      }

      return "unknown";
    }

    _isMobile(userAgent, userAgentData) {
      if (userAgentData && typeof userAgentData.mobile === "boolean") {
        return userAgentData.mobile;
      }

      return /Android|iPhone|iPod|Mobile|Windows Phone/i.test(
        String(userAgent || "")
      );
    }

    _supportsTouch() {
      return (
        "ontouchstart" in this.window ||
        Number(this.navigator.maxTouchPoints || 0) > 0
      );
    }

    _getTimezone() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
      } catch (_) {
        return null;
      }
    }

    _windowsVersion(version) {
      const versions = {
        "10.0": "10/11",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7",
        "6.0": "Vista",
        "5.2": "XP 64-bit/Server 2003",
        "5.1": "XP",
        "5.0": "2000"
      };

      return versions[version] || version;
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
              "Platform detector listener failed.",
              error
            );
          }
        }
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakePlatformDetector has been destroyed.");
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

  global.SnakePlatformDetector = SnakePlatformDetector;
})(window);