(function (global) {
  "use strict";

  class AuthController {
    constructor(options) {
      const settings = options || {};

      this.storage = settings.storage || null;
      this.events = settings.events || global.SnakeAppEvents || null;
      this.session = null;
      this.listeners = new Set();
      this.initialized = false;
      this.storageKey = "snake.auth.session";
    }

    initialize() {
      if (this.initialized) {
        return this.getSession();
      }

      const savedSession = this._loadSession();

      if (this._isValidSession(savedSession)) {
        this.session = savedSession;
      }

      this.initialized = true;

      this._emit(
        this.session ? "auth:restored" : "auth:guest",
        this.getSession()
      );

      return this.getSession();
    }

    createGuestSession(username) {
      this._assertInitialized();

      if (this.session) {
        throw new Error("A session is already active.");
      }

      const normalizedUsername = this._validateUsername(username);

      const session = {
        id: this._createId(),
        username: normalizedUsername,
        type: "guest",
        createdAt: new Date().toISOString(),
        expiresAt: null
      };

      this.session = session;
      this._saveSession(session);

      this._emit("auth:guest-created", this.getSession());

      return this.getSession();
    }

    restoreSession() {
      this._assertInitialized();

      const savedSession = this._loadSession();

      if (!this._isValidSession(savedSession)) {
        this.session = null;
        return null;
      }

      this.session = savedSession;

      this._emit("auth:restored", this.getSession());

      return this.getSession();
    }

    getSession() {
      return this.session ? { ...this.session } : null;
    }

    isAuthenticated() {
      return Boolean(
        this.session &&
        this.session.type === "authenticated"
      );
    }

    isGuest() {
      return Boolean(
        this.session &&
        this.session.type === "guest"
      );
    }

    isSessionActive() {
      return Boolean(this.session);
    }

    logout() {
      this._assertInitialized();

      if (!this.session) {
        return false;
      }

      const previousSession = this.getSession();

      this.session = null;
      this._removeSavedSession();

      this._emit("auth:logout", previousSession);

      return true;
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

    _validateUsername(username) {
      if (typeof username !== "string") {
        throw new TypeError("Username must be a string.");
      }

      const normalized = username.trim();

      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(normalized)) {
        throw new TypeError("Invalid username.");
      }

      return normalized;
    }

    _isValidSession(session) {
      if (!session || typeof session !== "object") {
        return false;
      }

      if (
        typeof session.id !== "string" ||
        typeof session.username !== "string" ||
        !["guest", "authenticated"].includes(session.type)
      ) {
        return false;
      }

      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(session.username)) {
        return false;
      }

      if (
        session.expiresAt &&
        Date.parse(session.expiresAt) <= Date.now()
      ) {
        return false;
      }

      return true;
    }

    _createId() {
      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        return global.crypto.randomUUID();
      }

      return [
        Date.now().toString(36),
        Math.random().toString(36).slice(2),
        Math.random().toString(36).slice(2)
      ].join("-");
    }

    _loadSession() {
      try {
        if (this.storage && typeof this.storage.get === "function") {
          return this.storage.get(this.storageKey);
        }

        if (global.localStorage) {
          const raw = global.localStorage.getItem(this.storageKey);
          return raw ? JSON.parse(raw) : null;
        }
      } catch (error) {
        this._log("Unable to restore authentication session.", error);
      }

      return null;
    }

    _saveSession(session) {
      try {
        if (this.storage && typeof this.storage.set === "function") {
          this.storage.set(this.storageKey, session);
          return true;
        }

        if (global.localStorage) {
          global.localStorage.setItem(
            this.storageKey,
            JSON.stringify(session)
          );

          return true;
        }
      } catch (error) {
        this._log("Unable to save authentication session.", error);
      }

      return false;
    }

    _removeSavedSession() {
      try {
        if (
          this.storage &&
          typeof this.storage.remove === "function"
        ) {
          this.storage.remove(this.storageKey);
          return;
        }

        if (global.localStorage) {
          global.localStorage.removeItem(this.storageKey);
        }
      } catch (error) {
        this._log("Unable to remove authentication session.", error);
      }
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
          this._log("Authentication listener failed.", error);
        }
      }

      if (this.events && typeof this.events.emit === "function") {
        this.events.emit(type, detail);
      }
    }

    _assertInitialized() {
      if (!this.initialized) {
        throw new Error("AuthController has not been initialized.");
      }
    }

    _log(message, error) {
      if (global.console && typeof global.console.warn === "function") {
        global.console.warn(message, error || "");
      }
    }

    destroy() {
      this.listeners.clear();
      this.session = null;
      this.initialized = false;
    }
  }

  global.SnakeAuthController = AuthController;
})(window);