(function (global) {
  "use strict";

  const SnakeAchievementRules = {
    rules: [],

    register(rule) {
      if (!rule || typeof rule !== "object") {
        throw new TypeError("Achievement rule must be an object.");
      }

      if (typeof rule.id !== "string" || !rule.id.trim()) {
        throw new TypeError("Achievement rule ID is required.");
      }

      if (typeof rule.evaluate !== "function") {
        throw new TypeError("Achievement rule requires an evaluate function.");
      }

      const normalized = {
        id: rule.id.trim(),
        achievementId:
          typeof rule.achievementId === "string"
            ? rule.achievementId.trim()
            : rule.id.trim(),
        event:
          typeof rule.event === "string"
            ? rule.event.trim()
            : "*",
        priority: this._number(rule.priority, 0),
        enabled: rule.enabled !== false,
        once: rule.once !== false,
        evaluate: rule.evaluate,
        metadata: this._safeObject(rule.metadata)
      };

      const existingIndex = this.rules.findIndex(
        (item) => item.id === normalized.id
      );

      if (existingIndex >= 0) {
        this.rules[existingIndex] = normalized;
      } else {
        this.rules.push(normalized);
      }

      this.rules.sort((a, b) => b.priority - a.priority);

      return this.getRule(normalized.id);
    },

    registerMany(rules) {
      if (!Array.isArray(rules)) {
        throw new TypeError("Rules must be an array.");
      }

      return rules.map((rule) => this.register(rule));
    },

    remove(id) {
      const previousLength = this.rules.length;

      this.rules = this.rules.filter((rule) => rule.id !== id);

      return this.rules.length !== previousLength;
    },

    setEnabled(id, enabled) {
      const rule = this.rules.find((item) => item.id === id);

      if (!rule) {
        return false;
      }

      rule.enabled = enabled === true;

      return true;
    },

    getRule(id) {
      const rule = this.rules.find((item) => item.id === id);

      if (!rule) {
        return null;
      }

      return {
        id: rule.id,
        achievementId: rule.achievementId,
        event: rule.event,
        priority: rule.priority,
        enabled: rule.enabled,
        once: rule.once,
        metadata: this._safeObject(rule.metadata)
      };
    },

    getRules(options) {
      const settings = options || {};

      let rules = this.rules.slice();

      if (settings.event) {
        rules = rules.filter(
          (rule) =>
            rule.event === settings.event ||
            rule.event === "*"
        );
      }

      if (settings.enabledOnly === true) {
        rules = rules.filter((rule) => rule.enabled);
      }

      return rules.map((rule) => ({
        id: rule.id,
        achievementId: rule.achievementId,
        event: rule.event,
        priority: rule.priority,
        enabled: rule.enabled,
        once: rule.once,
        metadata: this._safeObject(rule.metadata)
      }));
    },

    evaluate(eventName, payload, context) {
      const event = {
        name: String(eventName || ""),
        payload:
          payload && typeof payload === "object"
            ? payload
            : {},
        timestamp: new Date().toISOString()
      };

      const evaluationContext =
        context && typeof context === "object"
          ? context
          : {};

      const results = [];

      for (const rule of this.rules) {
        if (!rule.enabled) {
          continue;
        }

        if (rule.event !== "*" && rule.event !== event.name) {
          continue;
        }

        try {
          const result = rule.evaluate(
            event.payload,
            evaluationContext,
            event
          );

          if (result === false || result === null || result === undefined) {
            continue;
          }

          if (result === true) {
            results.push({
              ruleId: rule.id,
              achievementId: rule.achievementId,
              matched: true,
              progress: null,
              metadata: this._safeObject(rule.metadata)
            });

            continue;
          }

          if (typeof result === "number" && Number.isFinite(result)) {
            results.push({
              ruleId: rule.id,
              achievementId: rule.achievementId,
              matched: true,
              progress: Math.max(0, result),
              metadata: this._safeObject(rule.metadata)
            });

            continue;
          }

          if (typeof result === "object") {
            results.push({
              ruleId: rule.id,
              achievementId: rule.achievementId,
              matched: result.matched !== false,
              progress: this._validProgress(result.progress),
              metadata: {
                ...this._safeObject(rule.metadata),
                ...this._safeObject(result.metadata)
              }
            });
          }
        } catch (error) {
          this._emit("evaluation-error", {
            ruleId: rule.id,
            eventName: event.name,
            message:
              error && error.message
                ? error.message
                : "Achievement rule evaluation failed."
          });
        }
      }

      return results;
    },

    apply(eventName, payload, context, manager) {
      if (
        !manager ||
        typeof manager.updateProgress !== "function" ||
        typeof manager.unlock !== "function"
      ) {
        throw new TypeError("A compatible achievement manager is required.");
      }

      const matches = this.evaluate(eventName, payload, context);
      const results = [];

      for (const match of matches) {
        if (!match.matched) {
          continue;
        }

        try {
          let result;

          if (match.progress !== null) {
            result = manager.updateProgress(
              match.achievementId,
              match.progress,
              {
                sessionId:
                  payload && typeof payload.sessionId === "string"
                    ? payload.sessionId
                    : undefined,
                metadata: {
                  ruleId: match.ruleId,
                  eventName
                }
              }
            );
          } else {
            result = manager.unlock(match.achievementId, {
              sessionId:
                payload && typeof payload.sessionId === "string"
                  ? payload.sessionId
                  : undefined,
              metadata: {
                ruleId: match.ruleId,
                eventName
              }
            });
          }

          results.push({
            ruleId: match.ruleId,
            achievementId: match.achievementId,
            result
          });
        } catch (error) {
          this._emit("application-error", {
            ruleId: match.ruleId,
            achievementId: match.achievementId,
            message:
              error && error.message
                ? error.message
                : "Unable to apply achievement rule."
          });
        }
      }

      return results;
    },

    createThresholdRule(options) {
      const settings = options || {};
      const id = String(settings.id || "").trim();
      const achievementId = String(
        settings.achievementId || id
      ).trim();
      const metric = String(settings.metric || "").trim();
      const target = this._number(settings.target, NaN);

      if (!id || !achievementId || !metric || !Number.isFinite(target)) {
        throw new TypeError("Threshold rule configuration is invalid.");
      }

      return this.register({
        id,
        achievementId,
        event: settings.event || "*",
        priority: settings.priority || 0,
        enabled: settings.enabled !== false,
        once: settings.once !== false,
        metadata: settings.metadata || {},
        evaluate(payload, context) {
          const source = settings.source === "context"
            ? context
            : payload;

          const value = Number(source && source[metric]);

          if (!Number.isFinite(value)) {
            return false;
          }

          if (settings.comparison === "greater-than") {
            return value > target;
          }

          if (settings.comparison === "less-than") {
            return value < target;
          }

          if (settings.comparison === "at-least") {
            return value >= target;
          }

          if (settings.comparison === "at-most") {
            return value <= target;
          }

          return value >= target;
        }
      });
    },

    createCounterRule(options) {
      const settings = options || {};
      const id = String(settings.id || "").trim();
      const achievementId = String(
        settings.achievementId || id
      ).trim();
      const metric = String(settings.metric || "").trim();
      const target = this._number(settings.target, NaN);

      if (!id || !achievementId || !metric || !Number.isFinite(target)) {
        throw new TypeError("Counter rule configuration is invalid.");
      }

      return this.register({
        id,
        achievementId,
        event: settings.event || "*",
        priority: settings.priority || 0,
        enabled: settings.enabled !== false,
        once: settings.once !== false,
        metadata: settings.metadata || {},
        evaluate(payload, context) {
          const source = settings.source === "context"
            ? context
            : payload;

          const value = Number(source && source[metric]);

          if (!Number.isFinite(value)) {
            return false;
          }

          return {
            matched: true,
            progress: Math.min(target, Math.max(0, value)),
            metadata: {
              metric,
              target
            }
          };
        }
      });
    },

    _validProgress(value) {
      const number = Number(value);

      return Number.isFinite(number) && number >= 0
        ? number
        : null;
    },

    _number(value, fallback) {
      const number = Number(value);

      return Number.isFinite(number) ? number : fallback;
    },

    _safeObject(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
      }

      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        return {};
      }
    },

    _emit(type, details) {
      const event = {
        type,
        details: details || null,
        timestamp: new Date().toISOString()
      };

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit("achievement-rules:" + type, event);
      }
    },

    clear() {
      this.rules = [];
    }
  };

  global.SnakeAchievementRules = SnakeAchievementRules;
})(window);