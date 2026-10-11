(function (global) {
  "use strict";

  class GuestSession {
    constructor(options) {
      const settings = options || {};

      this.storage = settings.storage || null;
      this.storageKey = "snake.guest.session";
      this.session = null;
      this.initialized = false;
      this.listeners = new Set();
      this.maxUsernameLength = 24;
    }

    initialize() {
      if (this.initialized) {
        return this.getSession();
      }

      const saved = this._load();

      if (this._isValid(saved)) {
        this.session = saved;
      } else {
        this._remove();
      }

      this.initialized = true;

      this._emit(
        this.session ? "guest:restored" : "guest:ready",
        this.getSession()
      );

      return this.getSession();
    }

    start(username) {
      this._assertInitialized();

      if (this.session) {
        throw new Error("A guest session is already active.");
      }

      const normalizedUsername = this._validateUsername(username);
      const now = new Date().toISOString();

      this.session = {
        id: this._createId(),
        username: normalizedUsername,
        type: "guest",
        createdAt: now,
        lastActiveAt: now,
        statistics: {
          gamesPlayed: 0,
          totalScore: 0,
          highestScore: 0
        }
      };

      this._save();
      this._emit("guest:started", this.getSession());

      return this.getSession();
    }

    getSession() {
      return this.session
        ? JSON.parse(JSON.stringify(this.session))
        : null;
    }

    isActive() {
      return Boolean(this.session);
    }

    getUsername() {
      return this.session ? this.session.username : null;
    }

    updateUsername(username) {
      this._assertInitialized();

      if (!this.session) {
        return false;
      }

      this.session.username = this._validateUsername(username);
      this._touch();
      this._save();

      this._emit("guest:username-updated", this.getSession());

      return true;
    }

    recordGame(result) {
      this._assertInitialized();

      if (!this.session) {
        return false;
      }

      const data = result || {};
      const score = Number(data.score);

      if (!Number.isFinite(score) || score < 0) {
        return false;
      }

      this.session.statistics.gamesPlayed += 1;
      this.session.statistics.totalScore += score;
      this.session.statistics.highestScore = Math.max(
        this.session.statistics.highestScore,
        score
      );

      this._touch();
      this._save();

      this._emit("guest:game-recorded", {
        result: {
          score,
          won: data.won === true
        },
        session: this.getSession()
      });

      return true;
    }

    end() {
      this._assertInitialized();

      if (!this.session) {
        return false;
      }

      const previousSession = this.getSession();

      this.session = null;
      this._remove();

      this._emit("guest:ended", previousSession);

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
        throw new TypeError("Username must be text.");
      }

      const normalized = username.trim();

      if (
        normalized.length < 3 ||
        normalized.length > this.maxUsernameLength ||
        !/^[a-zA-Z0-9_-]+$/.test(normalized)
      ) {
        throw new TypeError("Invalid guest username.");
      }

      return normalized;
    }

    _isValid(session) {
      if (!session || typeof session !== "object") {
        return false;
      }

      if (
        typeof session.id !== "string" ||
        session.type !== "guest" ||
        typeof session.username !== "string"
      ) {
        return false;
      }

      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(session.username)) {
        return false;
      }

      if (
        !Number.isFinite(Date.parse(session.createdAt)) ||
        !Number.isFinite(Date.parse(session.lastActiveAt))
      ) {
        return false;
      }

      const statistics = session.statistics;

      if (!statistics || typeof statistics !== "object") {
        return false;
      }

      return [
        statistics.gamesPlayed,
        statistics.totalScore,
        statistics.highestScore
      ].every((value) => (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
      ));
    }

    _touch() {
      this.session.lastActiveAt = new Date().toISOString();
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
        Math.random().toString(36).slice(2)
      ].join("-");
    }

    _load() {
      try {
        if (this.storage && typeof this.storage.get === "function") {
          return this.storage.get(this.storageKey);
        }

        if (global.localStorage) {
          const raw = global.localStorage.getItem(this.storageKey);
          return raw ? JSON.parse(raw) : null;
        }
      } catch (error) {
        this._log("Unable to load guest session.", error);
      }

      return null;
    }

    _save() {
      try {
        if (this.storage && typeof this.storage.set === "function") {
          this.storage.set(this.storageKey, this.session);
          return true;
        }

        if (global.localStorage) {
          global.localStorage.setItem(
            this.storageKey,
            JSON.stringify(this.session)
          );

          return true;
        }
      } catch (error) {
        this._log("Unable to save guest session.", error);
      }

      return false;
    }

    _remove() {
      try {
        if (this.storage && typeof this.storage.remove === "function") {
          this.storage.remove(this.storageKey);
          return;
        }

        if (global.localStorage) {
          global.localStorage.removeItem(this.storageKey);
        }
      } catch (error) {
        this._log("Unable to remove guest session.", error);
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
          this._log("Guest session listener failed.", error);
        }
      }
    }

    _assertInitialized() {
      if (!this.initialized) {
        throw new Error("GuestSession has not been initialized.");
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

  global.SnakeGuestSession = GuestSession;
})(window);