(function (global) {
  "use strict";

  class SnakeSessionHistory {
    constructor(options) {
      const settings = options || {};

      this.storageKey = settings.storageKey || "snake-session-history";
      this.maxEntries = Math.max(
        1,
        Math.floor(Number(settings.maxEntries) || 100)
      );

      this.listeners = new Set();
      this.sessions = [];
      this.activeSession = null;
      this.destroyed = false;
      this.load();
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeSessionHistory has been destroyed.");
      }
    }

    _storage() {
      try {
        return global.localStorage || null;
      } catch (error) {
        return null;
      }
    }

    _createId() {
      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        return global.crypto.randomUUID();
      }

      return (
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 12)
      );
    }

    _validDate(value, fallback) {
      const timestamp = Date.parse(value || "");

      return Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : fallback || new Date().toISOString();
    }

    _normalizeSession(session, index) {
      if (!session || typeof session !== "object") {
        return null;
      }

      const score = Number(session.score);
      const duration = Number(session.duration);
      const level = Number(session.level);
      const startedAt = this._validDate(session.startedAt);
      const endedAt = this._validDate(session.endedAt, startedAt);

      return {
        id:
          typeof session.id === "string" && session.id
            ? session.id
            : "session-" + index,
        score:
          Number.isFinite(score) && score >= 0
            ? Math.floor(score)
            : 0,
        duration:
          Number.isFinite(duration) && duration >= 0
            ? Math.floor(duration)
            : 0,
        level:
          Number.isFinite(level) && level >= 1
            ? Math.floor(level)
            : 1,
        mode:
          typeof session.mode === "string"
            ? session.mode.slice(0, 40)
            : "classic",
        world:
          typeof session.world === "string"
            ? session.world.slice(0, 80)
            : "default",
        status:
          ["completed", "game-over", "abandoned"].includes(session.status)
            ? session.status
            : "completed",
        startedAt,
        endedAt,
        playerName:
          typeof session.playerName === "string"
            ? session.playerName.trim().slice(0, 40) || "Player"
            : "Player",
        foodEaten: this._safeCount(session.foodEaten),
        collisions: this._safeCount(session.collisions),
        pauseCount: this._safeCount(session.pauseCount),
        metadata:
          session.metadata &&
          typeof session.metadata === "object" &&
          !Array.isArray(session.metadata)
            ? this._safeMetadata(session.metadata)
            : {}
      };
    }

    _safeCount(value) {
      const number = Number(value);

      return Number.isFinite(number) && number >= 0
        ? Math.floor(number)
        : 0;
    }

    _safeMetadata(metadata) {
      try {
        return JSON.parse(JSON.stringify(metadata));
      } catch (error) {
        return {};
      }
    }

    load() {
      this._assertAlive();

      const storage = this._storage();

      if (!storage) {
        this.sessions = [];
        return this.getAll();
      }

      try {
        const raw = storage.getItem(this.storageKey);

        if (!raw) {
          this.sessions = [];
          return [];
        }

        const parsed = JSON.parse(raw);
        const entries = Array.isArray(parsed)
          ? parsed
          : parsed && Array.isArray(parsed.sessions)
            ? parsed.sessions
            : [];

        this.sessions = entries
          .map((session, index) => this._normalizeSession(session, index))
          .filter(Boolean)
          .sort(
            (a, b) =>
              Date.parse(b.endedAt) - Date.parse(a.endedAt)
          )
          .slice(0, this.maxEntries);

        return this.getAll();
      } catch (error) {
        this.sessions = [];
        this._emit("load-error", {
          message: "Unable to load session history."
        });

        return [];
      }
    }

    save() {
      this._assertAlive();

      const storage = this._storage();

      if (!storage) {
        return false;
      }

      try {
        storage.setItem(
          this.storageKey,
          JSON.stringify({
            version: 1,
            updatedAt: new Date().toISOString(),
            sessions: this.sessions
          })
        );

        return true;
      } catch (error) {
        this._emit("save-error", {
          message: "Unable to save session history."
        });

        return false;
      }
    }

    startSession(data) {
      this._assertAlive();

      if (this.activeSession) {
        this.finishSession("abandoned");
      }

      const settings = data || {};
      const now = new Date().toISOString();

      this.activeSession = {
        id: this._createId(),
        score: 0,
        duration: 0,
        level: 1,
        mode:
          typeof settings.mode === "string"
            ? settings.mode.slice(0, 40)
            : "classic",
        world:
          typeof settings.world === "string"
            ? settings.world.slice(0, 80)
            : "default",
        status: "in-progress",
        startedAt: now,
        endedAt: null,
        playerName:
          typeof settings.playerName === "string"
            ? settings.playerName.trim().slice(0, 40) || "Player"
            : "Player",
        foodEaten: 0,
        collisions: 0,
        pauseCount: 0,
        metadata: this._safeMetadata(settings.metadata || {})
      };

      this._emit("session-started", {
        session: this._clone(this.activeSession)
      });

      return this._clone(this.activeSession);
    }

    updateSession(patch) {
      this._assertAlive();

      if (!this.activeSession) {
        return null;
      }

      if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
        return this._clone(this.activeSession);
      }

      const numericFields = [
        "score",
        "duration",
        "level",
        "foodEaten",
        "collisions",
        "pauseCount"
      ];

      for (const field of numericFields) {
        if (Object.prototype.hasOwnProperty.call(patch, field)) {
          const value = Number(patch[field]);

          if (Number.isFinite(value) && value >= 0) {
            this.activeSession[field] =
              field === "level"
                ? Math.max(1, Math.floor(value))
                : Math.floor(value);
          }
        }
      }

      if (typeof patch.mode === "string") {
        this.activeSession.mode = patch.mode.slice(0, 40);
      }

      if (typeof patch.world === "string") {
        this.activeSession.world = patch.world.slice(0, 80);
      }

      if (typeof patch.playerName === "string") {
        this.activeSession.playerName =
          patch.playerName.trim().slice(0, 40) || "Player";
      }

      if (patch.metadata && typeof patch.metadata === "object") {
        this.activeSession.metadata = {
          ...this.activeSession.metadata,
          ...this._safeMetadata(patch.metadata)
        };
      }

      this._emit("session-updated", {
        session: this._clone(this.activeSession)
      });

      return this._clone(this.activeSession);
    }

    increment(field, amount) {
      this._assertAlive();

      const allowed = [
        "score",
        "duration",
        "foodEaten",
        "collisions",
        "pauseCount"
      ];

      if (!allowed.includes(field) || !this.activeSession) {
        return null;
      }

      const incrementBy = Number(amount === undefined ? 1 : amount);

      if (!Number.isFinite(incrementBy)) {
        return this._clone(this.activeSession);
      }

      this.activeSession[field] = Math.max(
        0,
        Math.floor(this.activeSession[field] + incrementBy)
      );

      this._emit("session-updated", {
        field,
        session: this._clone(this.activeSession)
      });

      return this._clone(this.activeSession);
    }

    finishSession(status, extraData) {
      this._assertAlive();

      if (!this.activeSession) {
        return null;
      }

      const finalStatus = [
        "completed",
        "game-over",
        "abandoned"
      ].includes(status)
        ? status
        : "completed";

      if (extraData && typeof extraData === "object") {
        this.updateSession(extraData);
      }

      const endedAt = new Date().toISOString();
      const startedAt = Date.parse(this.activeSession.startedAt);
      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.parse(endedAt) - startedAt) / 1000)
      );

      this.activeSession.duration = Math.max(
        this.activeSession.duration,
        elapsedSeconds
      );

      this.activeSession.status = finalStatus;
      this.activeSession.endedAt = endedAt;

      const completedSession = this._normalizeSession(
        this.activeSession,
        this.sessions.length
      );

      this.sessions.unshift(completedSession);
      this.sessions = this.sessions.slice(0, this.maxEntries);
      this.activeSession = null;

      this.save();

      this._emit("session-finished", {
        session: this._clone(completedSession)
      });

      return this._clone(completedSession);
    }

    getActiveSession() {
      this._assertAlive();

      return this.activeSession
        ? this._clone(this.activeSession)
        : null;
    }

    getAll(options) {
      this._assertAlive();

      const settings = options || {};
      let sessions = this.sessions.map((session) => this._clone(session));

      if (settings.mode) {
        sessions = sessions.filter(
          (session) => session.mode === settings.mode
        );
      }

      if (settings.world) {
        sessions = sessions.filter(
          (session) => session.world === settings.world
        );
      }

      if (settings.status) {
        sessions = sessions.filter(
          (session) => session.status === settings.status
        );
      }

      if (settings.from) {
        const from = Date.parse(settings.from);

        if (Number.isFinite(from)) {
          sessions = sessions.filter(
            (session) => Date.parse(session.endedAt) >= from
          );
        }
      }

      if (settings.to) {
        const to = Date.parse(settings.to);

        if (Number.isFinite(to)) {
          sessions = sessions.filter(
            (session) => Date.parse(session.endedAt) <= to
          );
        }
      }

      if (Number.isInteger(settings.limit) && settings.limit >= 0) {
        sessions = sessions.slice(0, settings.limit);
      }

      return sessions;
    }

    getById(id) {
      this._assertAlive();

      const session = this.sessions.find((item) => item.id === id);

      return session ? this._clone(session) : null;
    }

    getStatistics(options) {
      this._assertAlive();

      const sessions = this.getAll(options || {});

      const stats = {
        totalSessions: sessions.length,
        completedSessions: 0,
        gameOverSessions: 0,
        abandonedSessions: 0,
        totalScore: 0,
        bestScore: 0,
        averageScore: 0,
        totalDuration: 0,
        averageDuration: 0,
        highestLevel: 0,
        totalFoodEaten: 0,
        totalCollisions: 0,
        totalPauses: 0
      };

      for (const session of sessions) {
        stats.totalScore += session.score;
        stats.bestScore = Math.max(stats.bestScore, session.score);
        stats.totalDuration += session.duration;
        stats.highestLevel = Math.max(stats.highestLevel, session.level);
        stats.totalFoodEaten += session.foodEaten;
        stats.totalCollisions += session.collisions;
        stats.totalPauses += session.pauseCount;

        if (session.status === "completed") {
          stats.completedSessions += 1;
        } else if (session.status === "game-over") {
          stats.gameOverSessions += 1;
        } else if (session.status === "abandoned") {
          stats.abandonedSessions += 1;
        }
      }

      if (sessions.length > 0) {
        stats.averageScore = Math.round(
          stats.totalScore / sessions.length
        );

        stats.averageDuration = Math.round(
          stats.totalDuration / sessions.length
        );
      }

      return stats;
    }

    deleteSession(id) {
      this._assertAlive();

      const previousLength = this.sessions.length;

      this.sessions = this.sessions.filter(
        (session) => session.id !== id
      );

      if (this.sessions.length === previousLength) {
        return false;
      }

      this.save();
      this._emit("session-deleted", { id });

      return true;
    }

    clear(options) {
      this._assertAlive();

      const settings = options || {};

      if (settings.mode) {
        this.sessions = this.sessions.filter(
          (session) => session.mode !== settings.mode
        );
      } else {
        this.sessions = [];
      }

      this.save();

      this._emit("history-cleared", {
        mode: settings.mode || null
      });

      return true;
    }

    exportData(options) {
      this._assertAlive();

      return JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          sessions: this.getAll(options || {})
        },
        null,
        2
      );
    }

    importData(input, options) {
      this._assertAlive();

      let parsed;

      try {
        parsed = typeof input === "string" ? JSON.parse(input) : input;
      } catch (error) {
        throw new TypeError("Invalid session history data.");
      }

      const incoming = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.sessions)
          ? parsed.sessions
          : null;

      if (!incoming) {
        throw new TypeError("Session history must contain a sessions array.");
      }

      const settings = options || {};
      const normalized = incoming
        .map((session, index) => this._normalizeSession(session, index))
        .filter(Boolean);

      if (settings.replace === true) {
        this.sessions = normalized.slice(0, this.maxEntries);
      } else {
        const combined = new Map();

        for (const session of this.sessions) {
          combined.set(session.id, session);
        }

        for (const session of normalized) {
          if (!combined.has(session.id)) {
            combined.set(session.id, session);
          }
        }

        this.sessions = Array.from(combined.values())
          .sort(
            (a, b) =>
              Date.parse(b.endedAt) - Date.parse(a.endedAt)
          )
          .slice(0, this.maxEntries);
      }

      this.save();

      this._emit("history-imported", {
        count: normalized.length
      });

      return this.getAll();
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

    _emit(type, details) {
      const event = {
        type,
        details: details || null,
        timestamp: new Date().toISOString()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          if (
            global.console &&
            typeof global.console.error === "function"
          ) {
            global.console.error(
              "[SnakeSessionHistory] Listener error:",
              error
            );
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("history:" + type, event);
      }
    }

    _clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.activeSession) {
        this.finishSession("abandoned");
      }

      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeSessionHistory = SnakeSessionHistory;
})(window);