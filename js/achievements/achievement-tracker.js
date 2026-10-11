(function (global) {
  "use strict";

  class SnakeAchievementTracker {
    constructor(options) {
      const settings = options || {};

      this.manager =
        settings.manager ||
        (global.SnakeAchievementManager
          ? new global.SnakeAchievementManager()
          : null);

      this.rules =
        settings.rules ||
        global.SnakeAchievementRules ||
        null;

      this.eventBus =
        settings.eventBus ||
        global.SnakeEventBus ||
        null;

      this.listeners = new Set();
      this.eventCounts = new Map();
      this.metrics = new Map();
      this.processedEvents = new Set();
      this.maxProcessedEvents = Math.max(
        100,
        Math.floor(Number(settings.maxProcessedEvents) || 2000)
      );

      this.destroyed = false;
      this.unsubscribeCallbacks = [];
      this.storageKey =
        settings.storageKey || "snake-achievement-tracker";

      this._load();

      if (settings.autoSubscribe !== false) {
        this._subscribeToEvents();
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeAchievementTracker has been destroyed.");
      }
    }

    _storage() {
      try {
        return global.localStorage || null;
      } catch (error) {
        return null;
      }
    }

    _clone(value) {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        return value;
      }
    }

    _safeNumber(value, fallback) {
      const number = Number(value);

      return Number.isFinite(number) ? number : fallback;
    }

    _safeObject(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
      }

      return this._clone(value);
    }

    _subscribeToEvents() {
      if (
        this.eventBus &&
        typeof this.eventBus.on === "function"
      ) {
        const events = [
          "game:started",
          "game:over",
          "game:completed",
          "food:eaten",
          "level:completed",
          "world:completed",
          "game:paused",
          "game:resumed",
          "score:updated",
          "snake:collision"
        ];

        for (const eventName of events) {
          try {
            const callback = (payload) => {
              this.track(eventName, payload || {});
            };

            const unsubscribe = this.eventBus.on(
              eventName,
              callback
            );

            if (typeof unsubscribe === "function") {
              this.unsubscribeCallbacks.push(unsubscribe);
            }
          } catch (error) {
            this._emit("subscription-error", {
              eventName,
              message: error.message
            });
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.on === "function"
      ) {
        const callback = (event) => {
          if (!event || typeof event.type !== "string") {
            return;
          }

          if (event.type.startsWith("achievements:")) {
            return;
          }

          this.track(event.type, event.details || {});
        };

        try {
          const unsubscribe = global.SnakeAppEvents.on(
            "*",
            callback
          );

          if (typeof unsubscribe === "function") {
            this.unsubscribeCallbacks.push(unsubscribe);
          }
        } catch (error) {
          this._emit("subscription-error", {
            eventName: "*",
            message: error.message
          });
        }
      }
    }

    track(eventName, payload, options) {
      this._assertAlive();

      if (typeof eventName !== "string" || !eventName.trim()) {
        throw new TypeError("Event name is required.");
      }

      const settings = options || {};
      const normalizedName = eventName.trim();
      const data = this._safeObject(payload);
      const eventId =
        typeof settings.eventId === "string"
          ? settings.eventId
          : typeof data.eventId === "string"
            ? data.eventId
            : null;

      if (eventId && this.processedEvents.has(eventId)) {
        return {
          accepted: false,
          duplicate: true,
          eventName: normalizedName,
          results: []
        };
      }

      if (eventId) {
        this._rememberEvent(eventId);
      }

      this.eventCounts.set(
        normalizedName,
        (this.eventCounts.get(normalizedName) || 0) + 1
      );

      this._updateMetrics(normalizedName, data);

      const context = this.getContext();

      let ruleResults = [];
      let managerResults = [];

      if (
        this.rules &&
        typeof this.rules.apply === "function" &&
        this.manager
      ) {
        try {
          ruleResults = this.rules.apply(
            normalizedName,
            data,
            context,
            this.manager
          );
        } catch (error) {
          this._emit("rule-processing-error", {
            eventName: normalizedName,
            message: error.message
          });
        }
      } else if (
        this.rules &&
        typeof this.rules.evaluate === "function" &&
        this.manager
      ) {
        try {
          const matches = this.rules.evaluate(
            normalizedName,
            data,
            context
          );

          managerResults = this._applyRuleMatches(
            matches,
            normalizedName,
            data
          );
        } catch (error) {
          this._emit("rule-processing-error", {
            eventName: normalizedName,
            message: error.message
          });
        }
      }

      if (
        this.manager &&
        typeof this.manager.processEvent === "function"
      ) {
        try {
          managerResults = managerResults.concat(
            this.manager.processEvent(normalizedName, {
              ...data,
              eventId
            })
          );
        } catch (error) {
          this._emit("manager-processing-error", {
            eventName: normalizedName,
            message: error.message
          });
        }
      }

      this._save();

      const result = {
        accepted: true,
        duplicate: false,
        eventName: normalizedName,
        eventId,
        results: ruleResults.concat(managerResults),
        context
      };

      this._emit("event-tracked", result);

      return this._clone(result);
    }

    _applyRuleMatches(matches, eventName, payload) {
      if (!Array.isArray(matches) || !this.manager) {
        return [];
      }

      const results = [];

      for (const match of matches) {
        if (!match || match.matched === false) {
          continue;
        }

        try {
          let result;

          if (match.progress !== null && match.progress !== undefined) {
            result = this.manager.updateProgress(
              match.achievementId,
              match.progress,
              {
                sessionId: payload.sessionId,
                metadata: {
                  ruleId: match.ruleId,
                  eventName
                }
              }
            );
          } else {
            result = this.manager.unlock(
              match.achievementId,
              {
                sessionId: payload.sessionId,
                metadata: {
                  ruleId: match.ruleId,
                  eventName
                }
              }
            );
          }

          results.push({
            ruleId: match.ruleId,
            achievementId: match.achievementId,
            result
          });
        } catch (error) {
          this._emit("rule-application-error", {
            ruleId: match.ruleId,
            message: error.message
          });
        }
      }

      return results;
    }

    _rememberEvent(eventId) {
      this.processedEvents.add(eventId);

      while (this.processedEvents.size > this.maxProcessedEvents) {
        const oldest = this.processedEvents.values().next().value;
        this.processedEvents.delete(oldest);
      }
    }

    _updateMetrics(eventName, payload) {
      const current = this.metrics.get("global") || {
        gamesStarted: 0,
        gamesCompleted: 0,
        gamesLost: 0,
        foodEaten: 0,
        levelsCompleted: 0,
        worldsCompleted: 0,
        collisions: 0,
        pauses: 0,
        resumes: 0,
        highestScore: 0,
        highestLevel: 1,
        totalDuration: 0,
        lastEventAt: null
      };

      switch (eventName) {
        case "game:started":
        case "game-started":
          current.gamesStarted += 1;
          break;

        case "game:completed":
        case "game-completed":
          current.gamesCompleted += 1;
          break;

        case "game:over":
        case "game-over":
          current.gamesLost += 1;
          break;

        case "food:eaten":
        case "food-eaten":
          current.foodEaten += 1;
          break;

        case "level:completed":
        case "level-completed":
          current.levelsCompleted += 1;
          break;

        case "world:completed":
        case "world-completed":
          current.worldsCompleted += 1;
          break;

        case "snake:collision":
        case "collision":
          current.collisions += 1;
          break;

        case "game:paused":
        case "game-paused":
          current.pauses += 1;
          break;

        case "game:resumed":
        case "game-resumed":
          current.resumes += 1;
          break;
      }

      const score = this._safeNumber(payload.score, NaN);
      const level = this._safeNumber(payload.level, NaN);
      const duration = this._safeNumber(payload.duration, NaN);

      if (Number.isFinite(score)) {
        current.highestScore = Math.max(current.highestScore, score);
      }

      if (Number.isFinite(level)) {
        current.highestLevel = Math.max(current.highestLevel, level);
      }

      if (Number.isFinite(duration) && duration >= 0) {
        current.totalDuration = Math.max(
          current.totalDuration,
          duration
        );
      }

      current.lastEventAt = new Date().toISOString();

      this.metrics.set("global", current);

      const mode =
        typeof payload.mode === "string"
          ? payload.mode
          : "classic";

      const modeMetrics = this.metrics.get("mode:" + mode) || {
        gamesStarted: 0,
        gamesCompleted: 0,
        gamesLost: 0,
        foodEaten: 0,
        levelsCompleted: 0,
        worldsCompleted: 0,
        collisions: 0,
        highestScore: 0,
        highestLevel: 1
      };

      if (
        eventName === "game:started" ||
        eventName === "game-started"
      ) {
        modeMetrics.gamesStarted += 1;
      }

      if (
        eventName === "game:completed" ||
        eventName === "game-completed"
      ) {
        modeMetrics.gamesCompleted += 1;
      }

      if (eventName === "game:over" || eventName === "game-over") {
        modeMetrics.gamesLost += 1;
      }

      if (eventName === "food:eaten" || eventName === "food-eaten") {
        modeMetrics.foodEaten += 1;
      }

      if (
        eventName === "level:completed" ||
        eventName === "level-completed"
      ) {
        modeMetrics.levelsCompleted += 1;
      }

      if (
        eventName === "world:completed" ||
        eventName === "world-completed"
      ) {
        modeMetrics.worldsCompleted += 1;
      }

      if (
        eventName === "snake:collision" ||
        eventName === "collision"
      ) {
        modeMetrics.collisions += 1;
      }

      if (Number.isFinite(score)) {
        modeMetrics.highestScore = Math.max(
          modeMetrics.highestScore,
          score
        );
      }

      if (Number.isFinite(level)) {
        modeMetrics.highestLevel = Math.max(
          modeMetrics.highestLevel,
          level
        );
      }

      this.metrics.set("mode:" + mode, modeMetrics);
    }

    getContext() {
      this._assertAlive();

      const globalMetrics = this.metrics.get("global") || {};

      return {
        metrics: this._clone(globalMetrics),
        eventCounts: Object.fromEntries(this.eventCounts.entries()),
        trackedEvents: this.processedEvents.size,
        achievementStats:
          this.manager &&
          typeof this.manager.getStats === "function"
            ? this.manager.getStats()
            : null
      };
    }

    getMetrics(options) {
      this._assertAlive();

      const settings = options || {};

      if (settings.mode) {
        return this._clone(
          this.metrics.get("mode:" + settings.mode) || {}
        );
      }

      return this._clone(this.metrics.get("global") || {});
    }

    getEventCount(eventName) {
      this._assertAlive();

      return this.eventCounts.get(eventName) || 0;
    }

    getAllEventCounts() {
      this._assertAlive();

      return Object.fromEntries(this.eventCounts.entries());
    }

    resetMetrics(options) {
      this._assertAlive();

      const settings = options || {};

      if (settings.mode) {
        this.metrics.delete("mode:" + settings.mode);
      } else {
        this.metrics.clear();
        this.eventCounts.clear();
        this.processedEvents.clear();
      }

      this._save();

      this._emit("metrics-reset", {
        mode: settings.mode || null
      });

      return true;
    }

    _load() {
      const storage = this._storage();

      if (!storage) {
        return;
      }

      try {
        const raw = storage.getItem(this.storageKey);

        if (!raw) {
          return;
        }

        const data = JSON.parse(raw);

        if (!data || typeof data !== "object") {
          return;
        }

        if (
          data.eventCounts &&
          typeof data.eventCounts === "object"
        ) {
          for (const [key, value] of Object.entries(data.eventCounts)) {
            const count = this._safeNumber(value, 0);

            if (count >= 0) {
              this.eventCounts.set(key, Math.floor(count));
            }
          }
        }

        if (data.metrics && typeof data.metrics === "object") {
          for (const [key, value] of Object.entries(data.metrics)) {
            this.metrics.set(key, this._safeObject(value));
          }
        }

        if (Array.isArray(data.processedEvents)) {
          for (const eventId of data.processedEvents) {
            if (typeof eventId === "string") {
              this._rememberEvent(eventId);
            }
          }
        }
      } catch (error) {
        this.eventCounts.clear();
        this.metrics.clear();
        this.processedEvents.clear();
      }
    }

    _save() {
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
            eventCounts: Object.fromEntries(this.eventCounts.entries()),
            metrics: Object.fromEntries(this.metrics.entries()),
            processedEvents: Array.from(this.processedEvents)
          })
        );

        return true;
      } catch (error) {
        this._emit("save-error", {
          message: "Unable to save achievement tracker state."
        });

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
              "[SnakeAchievementTracker] Listener error:",
              error
            );
          }
        }
      }

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("achievement-tracker:" + type, event);
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      for (const unsubscribe of this.unsubscribeCallbacks) {
        try {
          unsubscribe();
        } catch (error) {
          // Ignore cleanup failures.
        }
      }

      this.unsubscribeCallbacks = [];
      this._save();
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeAchievementTracker = SnakeAchievementTracker;
})(window);