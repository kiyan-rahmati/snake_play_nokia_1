(function (global) {
  "use strict";

  class SnakePublicIPProvider {
    constructor(options) {
      const settings = options || {};

      this.fetch = settings.fetch || global.fetch.bind(global);
      this.timeout = Math.max(1000, Number(settings.timeout || 5000));
      this.cacheDuration = Math.max(
        0,
        Number(settings.cacheDuration ?? 300000)
      );

      this.providers = settings.providers || [
        {
          name: "ipify",
          url: "https://api.ipify.org?format=json",
          extract: (data) => data.ip
        },
        {
          name: "ipwho",
          url: "https://ipwho.is/",
          extract: (data) =>
            data.success === false ? null : data.ip
        }
      ];

      this.cachedIP = null;
      this.cachedAt = 0;
      this.pendingRequest = null;
      this.abortController = null;
      this.destroyed = false;
    }

    async getPublicIP(options) {
      this._assertAlive();

      const settings = options || {};
      const forceRefresh = Boolean(settings.forceRefresh);

      if (
        !forceRefresh &&
        this.cachedIP &&
        Date.now() - this.cachedAt < this.cacheDuration
      ) {
        return this._result(this.cachedIP, "cache");
      }

      if (this.pendingRequest && !forceRefresh) {
        return this.pendingRequest;
      }

      this.pendingRequest = this._resolveIP();

      try {
        const result = await this.pendingRequest;

        if (result.success) {
          this.cachedIP = result.ip;
          this.cachedAt = Date.now();
        }

        return result;
      } finally {
        this.pendingRequest = null;
      }
    }

    async _resolveIP() {
      const errors = [];

      for (const provider of this.providers) {
        if (this.destroyed) {
          break;
        }

        try {
          const result = await this._requestProvider(provider);

          if (result) {
            return {
              success: true,
              ip: result,
              provider: provider.name,
              source: "network",
              fetchedAt: new Date().toISOString()
            };
          }

          errors.push(provider.name + ": invalid response");
        } catch (error) {
          errors.push(
            provider.name + ": " + this._safeErrorMessage(error)
          );
        }
      }

      return {
        success: false,
        ip: null,
        provider: null,
        source: null,
        fetchedAt: null,
        errors
      };
    }

    async _requestProvider(provider) {
      if (
        !provider ||
        typeof provider.url !== "string" ||
        typeof provider.extract !== "function"
      ) {
        throw new Error("Invalid provider configuration.");
      }

      if (typeof this.fetch !== "function") {
        throw new Error("Fetch is unavailable.");
      }

      const controller =
        typeof global.AbortController === "function"
          ? new global.AbortController()
          : null;

      this.abortController = controller;

      let timeoutId = null;

      try {
        const requestOptions = {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        };

        if (controller) {
          requestOptions.signal = controller.signal;
        }

        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = global.setTimeout(() => {
            if (controller) {
              controller.abort();
            }

            reject(new Error("Request timed out."));
          }, this.timeout);
        });

        const requestPromise = this.fetch(
          provider.url,
          requestOptions
        );

        const response = await Promise.race([
          requestPromise,
          timeoutPromise
        ]);

        if (!response || !response.ok) {
          throw new Error(
            "HTTP " + (response ? response.status : "unknown")
          );
        }

        const data = await response.json();
        const ip = provider.extract(data);

        return this._isValidIP(ip) ? ip : null;
      } finally {
        if (timeoutId !== null) {
          global.clearTimeout(timeoutId);
        }

        if (this.abortController === controller) {
          this.abortController = null;
        }
      }
    }

    _isValidIP(value) {
      if (typeof value !== "string") {
        return false;
      }

      const ip = value.trim();

      return this._isValidIPv4(ip) || this._isValidIPv6(ip);
    }

    _isValidIPv4(ip) {
      const parts = ip.split(".");

      if (parts.length !== 4) {
        return false;
      }

      return parts.every((part) => {
        if (!/^\d{1,3}$/.test(part)) {
          return false;
        }

        if (part.length > 1 && part.startsWith("0")) {
          return false;
        }

        const value = Number(part);

        return value >= 0 && value <= 255;
      });
    }

    _isValidIPv6(ip) {
      if (
        typeof ip !== "string" ||
        !ip.includes(":") ||
        ip.length > 45 ||
        !/^[0-9a-fA-F:.]+$/.test(ip)
      ) {
        return false;
      }

      if ((ip.match(/::/g) || []).length > 1) {
        return false;
      }

      const compressed = ip.includes("::");
      const sections = ip.split(":");

      if (sections.some((section) => section.length > 4)) {
        return false;
      }

      const nonEmptySections = sections.filter(Boolean);

      if (nonEmptySections.some((section) => !/^[0-9a-fA-F]+$/.test(section))) {
        return false;
      }

      if (compressed) {
        return nonEmptySections.length < 8;
      }

      return (
        sections.length === 8 &&
        sections.every((section) => section.length > 0)
      );
    }

    _result(ip, source) {
      return {
        success: true,
        ip,
        provider: source === "cache" ? "cache" : null,
        source,
        fetchedAt: new Date(this.cachedAt).toISOString()
      };
    }

    _safeErrorMessage(error) {
      if (!error) {
        return "unknown error";
      }

      if (error.name === "AbortError") {
        return "request aborted";
      }

      return String(error.message || "request failed").slice(0, 120);
    }

    clearCache() {
      this.cachedIP = null;
      this.cachedAt = 0;
    }

    getCachedIP() {
      if (!this.cachedIP) {
        return null;
      }

      return {
        ip: this.cachedIP,
        cachedAt: new Date(this.cachedAt).toISOString()
      };
    }

    cancelPendingRequest() {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakePublicIPProvider has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.cancelPendingRequest();
      this.clearCache();
      this.pendingRequest = null;
      this.destroyed = true;
    }
  }

  global.SnakePublicIPProvider = SnakePublicIPProvider;
})(window);