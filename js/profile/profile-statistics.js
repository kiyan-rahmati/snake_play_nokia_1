(function (global) {
  "use strict";

  const DEFAULT_STATISTICS = Object.freeze({
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    highestScore: 0,
    totalFoodCollected: 0,
    totalPlayTime: 0,
    longestSnake: 0,
    worldsCompleted: 0,
    levelsCompleted: 0
  });

  class ProfileStatistics {
    constructor(options) {
      const settings = options || {};

      this.storageKey = settings.storageKey || "snake.profile.statistics";
      this.storage = settings.storage || null;
      this.statistics = { ...DEFAULT_STATISTICS };
      this.sessions = new Map();
      this.listeners = new Set();
      this.initialized = false;
    }

    initialize(initialData) {
      if (this.initialized) {
        return this.getStatistics();
      }

      const savedData = initialData || this._load();

      if (savedData && typeof savedData === "object") {
        for (const key of Object.keys(DEFAULT_STATISTICS)) {
          const value = savedData[key];

          if (typeof value === "number" && Number.isFinite(value)) {
            this.statistics[key] = Math.max(0, value);
          }
        }
      }

      this.initialized = true;
      return this.getStatistics();
    }

    getStatistics() {
      return { ...this.statistics };
    }

    get(key) {
      if (!Object.prototype.hasOwnProperty.call(this.statistics, key)) {
        return undefined;
      }

      return this.statistics[key];
    }

    recordGameStart(sessionId) {
      this._assertInitialized();

      const id = this._normalizeSessionId(sessionId);

      if (this.sessions.has(id)) {
        return false;
      }

      this.sessions.set(id, {
        startedAt: Date.now(),
        score: 0,
        foodCollected: 0,
        longestSnake: 0,
        finished: false
      });

      this.statistics.gamesPlayed += 1;
      this._commit("game-started", { sessionId: id });

      return true;
    }

    recordScore(sessionId, score) {
      this._assertInitialized();

      const session = this._getSession(sessionId);
      const value = this._validNumber(score);

      if (!session || value === null || session.finished) {
        return false;
      }

      session.score = Math.max(session.score, value);
      this.statistics.highestScore = Math.max(
        this.statistics.highestScore,
        session.score
      );

      this._commit("score-updated", {
        sessionId: this._normalizeSessionId(sessionId),
        score: session.score
      });

      return true;
    }

    recordFoodCollected(sessionId, amount) {
      this._assertInitialized();

      const session = this._getSession(sessionId);
      const count = this._validNumber(amount);

      if (!session || count === null || session.finished) {
        return false;
      }

      const increment = Math.floor(count);

      session.foodCollected += increment;
      this.statistics.totalFoodCollected += increment;

      this._commit("food-collected", {
        sessionId: this._normalizeSessionId(sessionId),
        amount: increment,
        total: this.statistics.totalFoodCollected
      });

      return true;
    }

    recordSnakeLength(sessionId, length) {
      this._assertInitialized();

      const session = this._getSession(sessionId);
      const value = this._validNumber(length);

      if (!session || value === null || session.finished) {
        return false;
      }

      session.longestSnake = Math.max(
        session.longestSnake,
        Math.floor(value)
      );

      this.statistics.longestSnake = Math.max(
        this.statistics.longestSnake,
        session.longestSnake
      );

      this._commit("snake-length-updated", {
        sessionId: this._normalizeSessionId(sessionId),
        length: session.longestSnake
      });

      return true;
    }

    recordGameEnd(sessionId, result) {
      this._assertInitialized();

      const session = this._getSession(sessionId);

      if (!session || session.finished) {
        return false;
      }

      const details = result || {};
      session.finished = true;

      const finalScore = this._validNumber(details.score);
      if (finalScore !== null) {
        session.score = Math.max(session.score, finalScore);
      }

      this.statistics.totalScore += session.score;
      this.statistics.highestScore = Math.max(
        this.statistics.highestScore,
        session.score
      );

      if (details.won === true) {
        this.statistics.gamesWon += 1;
      }

      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - session.startedAt) / 1000)
      );

      this.statistics.totalPlayTime += elapsedSeconds;

      const summary = {
        sessionId: this._normalizeSessionId(sessionId),
        score: session.score,
        foodCollected: session.foodCollected,
        longestSnake: session.longestSnake,
        duration: elapsedSeconds,
        won: details.won === true
      };

      this.sessions.delete(this._normalizeSessionId(sessionId));
      this._commit("game-ended", summary);

      return summary;
    }

    recordLevelCompleted() {
      this._assertInitialized();

      this.statistics.levelsCompleted += 1;
      this._commit("level-completed", this.getStatistics());

      return this.statistics.levelsCompleted;
    }

    recordWorldCompleted() {
      this._assertInitialized();

      this.statistics.worldsCompleted += 1;
      this._commit("world-completed", this.getStatistics());

      return this.statistics.worldsCompleted;
    }

    getWinRate() {
      const played = this.statistics.gamesPlayed;

      if (played === 0) {
        return 0;
      }

      return Math.round(
        (this.statistics.gamesWon / played) * 10000
      ) / 100;
    }

    getAverageScore() {
      const played = this.statistics.gamesPlayed;

      if (played === 0) {
        return 0;
      }

      return Math.round(this.statistics.totalScore / played);
    }

    getFormattedPlayTime() {
      const totalSeconds = Math.floor(this.statistics.totalPlayTime);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        hours,
        minutes,
        seconds,
        text: `${hours}h ${minutes}m ${seconds}s`
      };
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

    reset() {
      this._assertInitialized();

      this.statistics = { ...DEFAULT_STATISTICS };
      this.sessions.clear();

      this._commit("statistics-reset", this.getStatistics());

      return this.getStatistics();
    }

    _commit(type, detail) {
      this._save();

      const event = {
        type,
        detail,
        statistics: this.getStatistics(),
        timestamp: Date.now()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error("Statistics listener failed:", error);
          }
        }
      }
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
        this._log("Unable to load profile statistics.", error);
      }

      return null;
    }

    _save() {
      try {
        const data = this.getStatistics();

        if (this.storage && typeof this.storage.set === "function") {
          this.storage.set(this.storageKey, data);
          return true;
        }

        if (global.localStorage) {
          global.localStorage.setItem(
            this.storageKey,
            JSON.stringify(data)
          );

          return true;
        }
      } catch (error) {
        this._log("Unable to save profile statistics.", error);
      }

      return false;
    }

    _getSession(sessionId) {
      const id = this._normalizeSessionId(sessionId);
      return this.sessions.get(id) || null;
    }

    _normalizeSessionId(sessionId) {
      if (sessionId === undefined || sessionId === null) {
        throw new TypeError("A session ID is required.");
      }

      const id = String(sessionId).trim();

      if (!id || id.length > 128) {
        throw new TypeError("Invalid session ID.");
      }

      return id;
    }

    _validNumber(value) {
      const number = Number(value);

      if (!Number.isFinite(number) || number < 0) {
        return null;
      }

      return number;
    }

    _assertInitialized() {
      if (!this.initialized) {
        throw new Error("ProfileStatistics has not been initialized.");
      }
    }

    _log(message, error) {
      if (global.console && typeof global.console.warn === "function") {
        global.console.warn(message, error || "");
      }
    }
  }

  global.SnakeProfileStatistics = ProfileStatistics;
})(window);