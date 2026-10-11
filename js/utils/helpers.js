(function (global) {
  "use strict";

  const Helpers = {
    isDefined(value) {
      return value !== undefined && value !== null;
    },

    isObject(value) {
      return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      );
    },

    isPlainObject(value) {
      if (!this.isObject(value)) return false;

      const prototype = Object.getPrototypeOf(value);

      return prototype === Object.prototype || prototype === null;
    },

    isFunction(value) {
      return typeof value === "function";
    },

    isString(value) {
      return typeof value === "string";
    },

    isNumber(value) {
      return typeof value === "number" && Number.isFinite(value);
    },

    isInteger(value) {
      return Number.isInteger(value);
    },

    isBoolean(value) {
      return typeof value === "boolean";
    },

    clamp(value, minimum, maximum) {
      if (
        !Number.isFinite(value) ||
        !Number.isFinite(minimum) ||
        !Number.isFinite(maximum)
      ) {
        throw new TypeError("Clamp arguments must be finite numbers.");
      }

      if (minimum > maximum) {
        throw new RangeError("Minimum cannot exceed maximum.");
      }

      return Math.min(maximum, Math.max(minimum, value));
    },

    lerp(start, end, amount) {
      return start + (end - start) * amount;
    },

    inverseLerp(start, end, value) {
      if (start === end) return 0;

      return (value - start) / (end - start);
    },

    mapRange(value, inMin, inMax, outMin, outMax) {
      if (inMin === inMax) {
        throw new RangeError("Input range cannot have zero length.");
      }

      const amount = this.inverseLerp(inMin, inMax, value);

      return this.lerp(outMin, outMax, amount);
    },

    randomInteger(minimum, maximum) {
      if (
        !Number.isInteger(minimum) ||
        !Number.isInteger(maximum) ||
        minimum > maximum
      ) {
        throw new RangeError("Invalid random integer range.");
      }

      return (
        Math.floor(Math.random() * (maximum - minimum + 1)) +
        minimum
      );
    },

    randomFloat(minimum, maximum) {
      if (
        !Number.isFinite(minimum) ||
        !Number.isFinite(maximum) ||
        minimum > maximum
      ) {
        throw new RangeError("Invalid random number range.");
      }

      return Math.random() * (maximum - minimum) + minimum;
    },

    randomItem(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return undefined;
      }

      return items[this.randomInteger(0, items.length - 1)];
    },

    shuffle(items) {
      if (!Array.isArray(items)) {
        throw new TypeError("Shuffle requires an array.");
      }

      const result = items.slice();

      for (let index = result.length - 1; index > 0; index -= 1) {
        const target = this.randomInteger(0, index);

        [result[index], result[target]] = [
          result[target],
          result[index]
        ];
      }

      return result;
    },

    unique(items) {
      if (!Array.isArray(items)) {
        throw new TypeError("Unique requires an array.");
      }

      return Array.from(new Set(items));
    },

    removeItem(items, item) {
      if (!Array.isArray(items)) return false;

      const index = items.indexOf(item);

      if (index === -1) return false;

      items.splice(index, 1);

      return true;
    },

    groupBy(items, selector) {
      if (!Array.isArray(items)) {
        throw new TypeError("GroupBy requires an array.");
      }

      if (typeof selector !== "function") {
        throw new TypeError("GroupBy selector must be a function.");
      }

      return items.reduce((groups, item, index) => {
        const key = String(selector(item, index));

        if (!Object.prototype.hasOwnProperty.call(groups, key)) {
          groups[key] = [];
        }

        groups[key].push(item);

        return groups;
      }, Object.create(null));
    },

    sortBy(items, selector, direction) {
      if (!Array.isArray(items)) {
        throw new TypeError("SortBy requires an array.");
      }

      if (typeof selector !== "function") {
        throw new TypeError("SortBy selector must be a function.");
      }

      const multiplier = direction === "desc" ? -1 : 1;

      return items
        .map((item, index) => ({
          item,
          index,
          value: selector(item)
        }))
        .sort((first, second) => {
          if (first.value < second.value) return -1 * multiplier;
          if (first.value > second.value) return 1 * multiplier;

          return first.index - second.index;
        })
        .map((entry) => entry.item);
    },

    deepClone(value) {
      if (value === null || typeof value !== "object") {
        return value;
      }

      if (typeof global.structuredClone === "function") {
        try {
          return global.structuredClone(value);
        } catch (_) {
          // Fall back to recursive cloning.
        }
      }

      if (Array.isArray(value)) {
        return value.map((item) => this.deepClone(item));
      }

      if (value instanceof Date) {
        return new Date(value.getTime());
      }

      if (value instanceof Map) {
        const result = new Map();

        value.forEach((entryValue, key) => {
          result.set(
            this.deepClone(key),
            this.deepClone(entryValue)
          );
        });

        return result;
      }

      if (value instanceof Set) {
        const result = new Set();

        value.forEach((entryValue) => {
          result.add(this.deepClone(entryValue));
        });

        return result;
      }

      const result = Object.create(Object.getPrototypeOf(value));

      Reflect.ownKeys(value).forEach((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);

        if (!descriptor) return;

        if ("value" in descriptor) {
          descriptor.value = this.deepClone(descriptor.value);
        }

        Object.defineProperty(result, key, descriptor);
      });

      return result;
    },

    deepMerge(target, source) {
      if (!this.isPlainObject(target) || !this.isPlainObject(source)) {
        return this.deepClone(source);
      }

      const result = this.deepClone(target);

      Object.keys(source).forEach((key) => {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
          this.isPlainObject(sourceValue) &&
          this.isPlainObject(targetValue)
        ) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = this.deepClone(sourceValue);
        }
      });

      return result;
    },

    getNestedValue(object, path, fallback) {
      if (!object || typeof path !== "string" || !path.trim()) {
        return fallback;
      }

      const value = path.split(".").reduce((current, key) => {
        if (
          current === null ||
          current === undefined ||
          !Object.prototype.hasOwnProperty.call(current, key)
        ) {
          return undefined;
        }

        return current[key];
      }, object);

      return value === undefined ? fallback : value;
    },

    setNestedValue(object, path, value) {
      if (!this.isObject(object)) {
        throw new TypeError("Target must be an object.");
      }

      if (typeof path !== "string" || !path.trim()) {
        throw new TypeError("Path must be a non-empty string.");
      }

      const keys = path.split(".").filter(Boolean);

      if (!keys.length) {
        throw new TypeError("Invalid nested property path.");
      }

      let current = object;

      for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index];

        if (
          !Object.prototype.hasOwnProperty.call(current, key) ||
          !this.isObject(current[key])
        ) {
          current[key] = {};
        }

        current = current[key];
      }

      current[keys[keys.length - 1]] = value;

      return object;
    },

    debounce(callback, delay) {
      if (typeof callback !== "function") {
        throw new TypeError("Debounce requires a function.");
      }

      let timer = null;

      const debounced = function (...args) {
        const context = this;

        if (timer !== null) {
          global.clearTimeout(timer);
        }

        timer = global.setTimeout(() => {
          timer = null;
          callback.apply(context, args);
        }, Math.max(0, Number(delay) || 0));
      };

      debounced.cancel = () => {
        if (timer !== null) {
          global.clearTimeout(timer);
          timer = null;
        }
      };

      debounced.flush = () => {
        if (timer === null) return;

        global.clearTimeout(timer);
        timer = null;

        callback();
      };

      return debounced;
    },

    throttle(callback, interval) {
      if (typeof callback !== "function") {
        throw new TypeError("Throttle requires a function.");
      }

      let lastExecution = 0;
      let timer = null;
      let latestArgs = null;
      let latestContext = null;

      const wait = Math.max(0, Number(interval) || 0);

      const throttled = function (...args) {
        const now = Date.now();
        const remaining = wait - (now - lastExecution);

        latestArgs = args;
        latestContext = this;

        if (remaining <= 0) {
          if (timer !== null) {
            global.clearTimeout(timer);
            timer = null;
          }

          lastExecution = now;

          const callArgs = latestArgs;
          const callContext = latestContext;

          latestArgs = null;
          latestContext = null;

          callback.apply(callContext, callArgs);
          return;
        }

        if (timer === null) {
          timer = global.setTimeout(() => {
            timer = null;
            lastExecution = Date.now();

            const callArgs = latestArgs;
            const callContext = latestContext;

            latestArgs = null;
            latestContext = null;

            callback.apply(callContext, callArgs);
          }, remaining);
        }
      };

      throttled.cancel = () => {
        if (timer !== null) {
          global.clearTimeout(timer);
        }

        timer = null;
        latestArgs = null;
        latestContext = null;
        lastExecution = 0;
      };

      return throttled;
    },

    once(callback) {
      if (typeof callback !== "function") {
        throw new TypeError("Once requires a function.");
      }

      let called = false;
      let result;

      return function (...args) {
        if (called) return result;

        called = true;
        result = callback.apply(this, args);

        return result;
      };
    },

    createId(prefix) {
      const normalizedPrefix = prefix
        ? String(prefix).replace(/[^a-zA-Z0-9_-]/g, "")
        : "id";

      let uniquePart;

      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        uniquePart = global.crypto.randomUUID();
      } else {
        uniquePart =
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2, 12);
      }

      return `${normalizedPrefix}-${uniquePart}`;
    },

    escapeHTML(value) {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return String(value).replace(/[&<>"']/g, (character) => {
        return replacements[character];
      });
    },

    stripHTML(value) {
      return String(value).replace(/<[^>]*>/g, "");
    },

    normalizeWhitespace(value) {
      return String(value)
        .replace(/\s+/g, " ")
        .trim();
    },

    capitalize(value) {
      const text = String(value);

      if (!text) return "";

      return text.charAt(0).toUpperCase() + text.slice(1);
    },

    truncate(value, maximumLength, suffix) {
      const text = String(value);
      const maximum = Math.max(0, Number(maximumLength) || 0);
      const ending = suffix === undefined ? "…" : String(suffix);

      if (text.length <= maximum) return text;
      if (maximum <= ending.length) return ending.slice(0, maximum);

      return text.slice(0, maximum - ending.length) + ending;
    },

    sleep(milliseconds) {
      return new Promise((resolve) => {
        global.setTimeout(resolve, Math.max(0, milliseconds || 0));
      });
    },

    isMobile() {
      if (global.matchMedia) {
        return global.matchMedia(
          "(pointer: coarse)"
        ).matches;
      }

      return Boolean(
        global.navigator &&
        /Android|iPhone|iPad|iPod|Mobile/i.test(
          global.navigator.userAgent
        )
      );
    },

    prefersReducedMotion() {
      return Boolean(
        global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    },

    getViewportSize() {
      return {
        width: global.innerWidth || 0,
        height: global.innerHeight || 0
      };
    },

    isElementVisible(element) {
      if (!element || !element.isConnected) return false;

      const style = global.getComputedStyle(element);

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        return false;
      }

      const bounds = element.getBoundingClientRect();

      return bounds.width > 0 && bounds.height > 0;
    },

    safeCall(callback, fallback) {
      if (typeof callback !== "function") {
        return fallback;
      }

      try {
        return callback();
      } catch (error) {
        if (
          global.console &&
          typeof global.console.error === "function"
        ) {
          global.console.error("[SnakeHelpers] Callback failed:", error);
        }

        return fallback;
      }
    },

    safeParseJSON(value, fallback) {
      if (typeof value !== "string") return fallback;

      try {
        return JSON.parse(value);
      } catch (_) {
        return fallback;
      }
    },

    toJSON(value, spacing) {
      try {
        return JSON.stringify(value, null, spacing || 0);
      } catch (_) {
        return null;
      }
    }
  };

  global.SnakeHelpers = Object.freeze(Helpers);
})(window);