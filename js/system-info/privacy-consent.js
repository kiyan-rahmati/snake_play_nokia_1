// privacy-consent.js
(function (global) {
  "use strict";

  const STORAGE_KEY = "snake-privacy-consent";
  const CONSENT_VERSION = 1;

  const CATEGORIES = Object.freeze({
    systemInfo: "systemInfo",
    publicIP: "publicIP",
    analytics: "analytics",
    localStorage: "localStorage"
  });

  class SnakePrivacyConsent {
    constructor(options) {
      const settings = options || {};

      this.storage =
        settings.storage === undefined
          ? this._getStorage()
          : settings.storage;

      this.storageKey = settings.storageKey || STORAGE_KEY;
      this.version = Number(settings.version || CONSENT_VERSION);
      this.consents = this._createDefaultConsents();
      this.listeners = new Set();
      this.initialized = false;
      this.destroyed = false;

      if (settings.autoLoad !== false) {
        this.load();
      }
    }

    _createDefaultConsents() {
      return {
        systemInfo: false,
        publicIP: false,
        analytics: false,
        localStorage: true
      };
    }

    _getStorage() {
      try {
        return global.localStorage || null;
      } catch (error) {
        return null;
      }
    }

    load() {
      this._assertAlive();

      const defaults = this._createDefaultConsents();
      let saved = null;

      try {
        const raw = this.storage
          ? this.storage.getItem(this.storageKey)
          : null;

        if (raw) {
          saved = JSON.parse(raw);
        }
      } catch (error) {
        saved = null;
      }

      if (
        saved &&
        saved.version === this.version &&
        saved.consents &&
        typeof saved.consents === "object"
      ) {
        for (const category of Object.keys(defaults)) {
          if (typeof saved.consents[category] === "boolean") {
            defaults[category] = saved.consents[category];
          }
        }
      }

      this.consents = defaults;
      this.initialized = true;

      this._emit("loaded");

      return this.getAll();
    }

    getAll() {
      this._assertAlive();

      return {
        ...this.consents
      };
    }

    hasConsent(category) {
      this._assertAlive();

      if (!Object.prototype.hasOwnProperty.call(CATEGORIES, category)) {
        return false;
      }

      return this.consents[category] === true;
    }

    setConsent(category, granted) {
      this._assertAlive();

      if (!Object.prototype.hasOwnProperty.call(CATEGORIES, category)) {
        throw new Error("Unknown privacy consent category.");
      }

      if (typeof granted !== "boolean") {
        throw new TypeError("Consent value must be a boolean.");
      }

      this.consents = {
        ...this.consents,
        [category]: granted
      };

      this._save();
      this._emit("changed", {
        category,
        granted
      });

      return this.hasConsent(category);
    }

    setMultipleConsents(values) {
      this._assertAlive();

      if (!values || typeof values !== "object" || Array.isArray(values)) {
        throw new TypeError("Consent values must be an object.");
      }

      const updated = {
        ...this.consents
      };

      for (const [category, granted] of Object.entries(values)) {
        if (!Object.prototype.hasOwnProperty.call(CATEGORIES, category)) {
          throw new Error("Unknown privacy consent category: " + category);
        }

        if (typeof granted !== "boolean") {
          throw new TypeError(
            "Consent value must be a boolean for " + category
          );
        }

        updated[category] = granted;
      }

      this.consents = updated;
      this._save();

      this._emit("changed", {
        category: null,
        granted: null
      });

      return this.getAll();
    }

    acceptOptionalConsents() {
      return this.setMultipleConsents({
        systemInfo: true,
        publicIP: true,
        analytics: true
      });
    }

    rejectOptionalConsents() {
      return this.setMultipleConsents({
        systemInfo: false,
        publicIP: false,
        analytics: false
      });
    }

    reset() {
      this._assertAlive();

      this.consents = this._createDefaultConsents();
      this._save();
      this._emit("reset");

      return this.getAll();
    }

    _save() {
      if (!this.storage) {
        return false;
      }

      try {
        this.storage.setItem(
          this.storageKey,
          JSON.stringify({
            version: this.version,
            updatedAt: new Date().toISOString(),
            consents: this.consents
          })
        );

        return true;
      } catch (error) {
        return false;
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

    _emit(eventName, details) {
      const event = {
        type: eventName,
        details: details || null,
        consents: {
          ...this.consents
        },
        timestamp: new Date().toISOString()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error(
              "[SnakePrivacyConsent] Listener error:",
              error
            );
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("privacy:" + eventName, event);
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakePrivacyConsent has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakePrivacyConsent = SnakePrivacyConsent;
  global.SnakePrivacyCategories = CATEGORIES;
})(window);