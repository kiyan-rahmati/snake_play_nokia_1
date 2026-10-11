(function (global) {
  "use strict";

  class DemoSession {
    constructor(options) {
      const settings = options || {};

      this.storage = settings.storage || null;
      this.storageKey = "snake.demo.session";
      this.session = null;
      this.initialized = false;
      this.listeners = new Set();
      this.maxDuration = 24 * 60 * 60 * 1000;
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
        this.session ? "demo:restored" : "demo:ready",
        this.getSession()
      );

      return this.getSession();
    }

    start(username) {
      this._assertInitialized();

      if (this.session && !this.isExpired()) {
        throw new Error("A demo session is already active.");
      }

      const name = this._validateUsername(username);
      const now = Date.now();

      this.session = {
        id: this._createId(),
        username: name,
        type: "demo",
        startedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + this.maxDuration).toISOString(),
        statistics: {
          gamesPlayed: 0,
          totalScore: 0,
          highestScore: 0
        }
      };

      this._save();
      this._emit("demo:started", this.getSession());

      return this.getSession();
    }

    getSession() {
      if (!this.session) {
        return null;
      }

      return JSON.parse(JSON.stringify(this.session));
    }

    isActive() {
      return Boolean(this.session && !this.isExpired());
    }

    isExpired() {
      if (!this.session || !this.session.expiresAt) {
        return true;
      }

      return Date.parse(this.session.expiresAt) <= Date.now();
    }

    recordGame(result) {
      this._assertInitialized();

      if (!this.isActive()) {
        this.end("expired");
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

      this._save();

      this._emit("demo:game-recorded", {
        result: {
          score,
          won: data.won === true
        },
        session: this.getSession()
      });

      return true;
    }

    end(reason) {
      this._assertInitialized();

      if (!this.session) {
        return false;
      }

      const previousSession = this.getSession();

      this.session = null;
      this._remove();

      this._emit("demo:ended", {
        reason: reason || "user-ended",
        session: previousSession
      });

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

      const value = username.trim();

      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(value)) {
        throw new TypeError("Invalid username.");
      }

      return value;
    }

    _isValid(session) {
      if (!session || typeof session !== "object") {
        return false;
      }

      if (
        typeof session.id !== "string" ||
        typeof session.username !== "string" ||
        session.type !== "demo"
      ) {
        return false;
      }

      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(session.username)) {
        return false;
      }

      const startedAt = Date.parse(session.startedAt);
      const expiresAt = Date.parse(session.expiresAt);

      if (
        !Number.isFinite(startedAt) ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now() ||
        expiresAt <= startedAt ||
        expiresAt - startedAt > this.maxDuration
      ) {
        return false;
      }

      const stats = session.statistics;

      if (!stats || typeof stats !== "object") {
        return false;
      }

      return [
        stats.gamesPlayed,
        stats.totalScore,
        stats.highestScore
      ].every((value) => (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
      ));
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
          const value = global.localStorage.getItem(this.storageKey);
          return value ? JSON.parse(value) : null;
        }
      } catch (error) {
        this._log("Unable to load demo session.", error);
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
        this._log("Unable to save demo session.", error);
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
        this._log("Unable to remove demo session.", error);
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
          this._log("Demo session listener failed.", error);
        }
      }
    }

    _assertInitialized() {
      if (!this.initialized) {
        throw new Error("DemoSession has not been initialized.");
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

  global.SnakeDemoSession = DemoSession;
})(window);