(function (global) {
  "use strict";

  const LEVELS = Object.freeze({
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    SILENT: 100
  });

  const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    level: "INFO",
    prefix: "SnakeGame",
    timestamp: true,
    persistErrors: false,
    maxStoredErrors: 50
  });

  const STORAGE_KEY = "snake-game-error-log";

  let config = { ...DEFAULT_CONFIG };
  let errorHistory = [];
  let groupDepth = 0;

  function normalizeLevel(level) {
    const normalized = String(level || "INFO").toUpperCase();
    return Object.prototype.hasOwnProperty.call(LEVELS, normalized)
      ? normalized
      : "INFO";
  }

  function timestamp() {
    return new Date().toISOString();
  }

  function shouldLog(level) {
    if (!config.enabled) {
      return false;
    }

    return LEVELS[level] >= LEVELS[normalizeLevel(config.level)];
  }

  function formatPrefix(level) {
    const parts = [];

    if (config.prefix) {
      parts.push(`[${config.prefix}]`);
    }

    if (config.timestamp) {
      parts.push(`[${timestamp()}]`);
    }

    parts.push(`[${level}]`);

    return parts.join(" ");
  }

  function getConsoleMethod(level) {
    switch (level) {
      case "DEBUG":
        return console.debug || console.log;
      case "INFO":
        return console.info || console.log;
      case "WARN":
        return console.warn || console.log;
      case "ERROR":
        return console.error || console.log;
      default:
        return console.log;
    }
  }

  function write(level, args) {
    if (!shouldLog(level)) {
      return;
    }

    const method = getConsoleMethod(level);
    const indentation = "  ".repeat(groupDepth);

    method.call(
      console,
      `${indentation}${formatPrefix(level)}`,
      ...Array.from(args)
    );

    if (level === "ERROR") {
      recordError(args);
    }
  }

  function safeSerialize(value) {
    const seen = new WeakSet();

    try {
      return JSON.stringify(value, (key, currentValue) => {
        if (typeof currentValue === "bigint") {
          return `${currentValue.toString()}n`;
        }

        if (currentValue instanceof Error) {
          return {
            name: currentValue.name,
            message: currentValue.message,
            stack: currentValue.stack
          };
        }

        if (typeof currentValue === "object" && currentValue !== null) {
          if (seen.has(currentValue)) {
            return "[Circular]";
          }

          seen.add(currentValue);
        }

        return currentValue;
      });
    } catch (error) {
      return String(value);
    }
  }

  function recordError(args) {
    const entry = {
      time: timestamp(),
      message: Array.from(args)
        .map((value) => {
          if (value instanceof Error) {
            return `${value.name}: ${value.message}`;
          }

          return typeof value === "string"
            ? value
            : safeSerialize(value);
        })
        .join(" ")
    };

    errorHistory.push(entry);

    const maximum = Math.max(
      1,
      Math.floor(Number(config.maxStoredErrors) || 50)
    );

    if (errorHistory.length > maximum) {
      errorHistory = errorHistory.slice(-maximum);
    }

    if (config.persistErrors) {
      persistErrors();
    }
  }

  function persistErrors() {
    try {
      if (!global.localStorage) {
        return false;
      }

      global.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(errorHistory)
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  function restoreErrors() {
    try {
      if (!global.localStorage) {
        return [];
      }

      const stored = global.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);

      return Array.isArray(parsed)
        ? parsed.filter(
            (entry) =>
              entry &&
              typeof entry.time === "string" &&
              typeof entry.message === "string"
          )
        : [];
    } catch (error) {
      return [];
    }
  }

  function configure(options) {
    if (!options || typeof options !== "object") {
      return getConfig();
    }

    config = {
      ...config,
      ...options
    };

    config.level = normalizeLevel(config.level);
    config.enabled = Boolean(config.enabled);
    config.timestamp = Boolean(config.timestamp);
    config.persistErrors = Boolean(config.persistErrors);

    config.maxStoredErrors = Math.max(
      1,
      Math.floor(Number(config.maxStoredErrors) || 50)
    );

    return getConfig();
  }

  function getConfig() {
    return Object.freeze({ ...config });
  }

  function createLogger(namespace) {
    const name = String(namespace || "").trim();

    function emit(level, args) {
      const previousPrefix = config.prefix;

      if (name) {
        config.prefix = `${previousPrefix}:${name}`;
      }

      try {
        write(level, args);
      } finally {
        config.prefix = previousPrefix;
      }
    }

    return Object.freeze({
      debug(...args) {
        emit("DEBUG", args);
      },

      info(...args) {
        emit("INFO", args);
      },

      warn(...args) {
        emit("WARN", args);
      },

      error(...args) {
        emit("ERROR", args);
      },

      group(label) {
        emit("INFO", [label]);

        if (typeof console.group === "function" && shouldLog("INFO")) {
          console.group(label);
        }

        groupDepth += 1;
      },

      groupCollapsed(label) {
        emit("INFO", [label]);

        if (
          typeof console.groupCollapsed === "function" &&
          shouldLog("INFO")
        ) {
          console.groupCollapsed(label);
        }

        groupDepth += 1;
      },

      groupEnd() {
        groupDepth = Math.max(0, groupDepth - 1);

        if (typeof console.groupEnd === "function" && config.enabled) {
          console.groupEnd();
        }
      },

      time(label) {
        if (config.enabled && typeof console.time === "function") {
          console.time(`${name || config.prefix}:${label}`);
        }
      },

      timeEnd(label) {
        if (config.enabled && typeof console.timeEnd === "function") {
          console.timeEnd(`${name || config.prefix}:${label}`);
        }
      },

      table(data, columns) {
        if (!shouldLog("INFO") || typeof console.table !== "function") {
          return;
        }

        console.table(data, columns);
      },

      assert(condition, ...args) {
        if (!condition) {
          emit("ERROR", args.length ? args : ["Assertion failed"]);
        }
      },

      child(childNamespace) {
        return createLogger(
          [name, childNamespace].filter(Boolean).join(":")
        );
      }
    });
  }

  const Logger = {
    LEVELS,

    configure,

    getConfig,

    setLevel(level) {
      config.level = normalizeLevel(level);
      return config.level;
    },

    enable() {
      config.enabled = true;
    },

    disable() {
      config.enabled = false;
    },

    debug(...args) {
      write("DEBUG", args);
    },

    info(...args) {
      write("INFO", args);
    },

    warn(...args) {
      write("WARN", args);
    },

    error(...args) {
      write("ERROR", args);
    },

    group(label) {
      if (shouldLog("INFO") && typeof console.group === "function") {
        console.group(`${formatPrefix("INFO")} ${label}`);
      }

      groupDepth += 1;
    },

    groupCollapsed(label) {
      if (
        shouldLog("INFO") &&
        typeof console.groupCollapsed === "function"
      ) {
        console.groupCollapsed(`${formatPrefix("INFO")} ${label}`);
      }

      groupDepth += 1;
    },

    groupEnd() {
      groupDepth = Math.max(0, groupDepth - 1);

      if (config.enabled && typeof console.groupEnd === "function") {
        console.groupEnd();
      }
    },

    time(label) {
      if (config.enabled && typeof console.time === "function") {
        console.time(`${config.prefix}:${label}`);
      }
    },

    timeEnd(label) {
      if (config.enabled && typeof console.timeEnd === "function") {
        console.timeEnd(`${config.prefix}:${label}`);
      }
    },

    table(data, columns) {
      if (shouldLog("INFO") && typeof console.table === "function") {
        console.table(data, columns);
      }
    },

    assert(condition, ...args) {
      if (!condition) {
        write(
          "ERROR",
          args.length ? args : ["Assertion failed"]
        );
      }
    },

    create(namespace) {
      return createLogger(namespace);
    },

    getErrors() {
      return errorHistory.map((entry) => ({ ...entry }));
    },

    clearErrors() {
      errorHistory = [];

      try {
        if (global.localStorage) {
          global.localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        return false;
      }

      return true;
    },

    exportErrors() {
      return JSON.stringify(errorHistory, null, 2);
    },

    restoreErrors() {
      errorHistory = restoreErrors();

      const maximum = Math.max(
        1,
        Math.floor(Number(config.maxStoredErrors) || 50)
      );

      if (errorHistory.length > maximum) {
        errorHistory = errorHistory.slice(-maximum);
      }

      return this.getErrors();
    },

    handleWindowError(event) {
      if (!event) {
        return;
      }

      const details = {
        message: event.message || "Unknown window error",
        source: event.filename || "",
        line: event.lineno || 0,
        column: event.colno || 0,
        error: event.error || null
      };

      write("ERROR", ["Unhandled window error", details]);
    },

    handleUnhandledRejection(event) {
      if (!event) {
        return;
      }

      write("ERROR", [
        "Unhandled promise rejection",
        event.reason || "Unknown rejection"
      ]);
    }
  };

  if (config.persistErrors) {
    errorHistory = restoreErrors();
  }

  global.SnakeLogger = Object.freeze(Logger);
})(window);