(function (global) {
  "use strict";

  class SnakeInputMapping {
    constructor(options) {
      const settings = options || {};

      this.storage = settings.storage || null;
      this.storageKey = settings.storageKey || "input-mapping";
      this.listeners = new Map();
      this.destroyed = false;

      this.defaults = this.createDefaults();
      this.mapping = this.clone(this.defaults);

      if (settings.mapping) {
        this.setMapping(settings.mapping, { silent: true });
      } else {
        this.load();
      }
    }

    createDefaults() {
      return {
        up: {
          keyboard: ["ArrowUp", "KeyW"],
          touch: ["up"]
        },
        down: {
          keyboard: ["ArrowDown", "KeyS"],
          touch: ["down"]
        },
        left: {
          keyboard: ["ArrowLeft", "KeyA"],
          touch: ["left"]
        },
        right: {
          keyboard: ["ArrowRight", "KeyD"],
          touch: ["right"]
        },
        pause: {
          keyboard: ["Space", "Escape", "KeyP"],
          touch: ["pause"]
        },
        restart: {
          keyboard: ["KeyR"],
          touch: ["restart"]
        },
        confirm: {
          keyboard: ["Enter"],
          touch: ["confirm"]
        },
        mute: {
          keyboard: ["KeyM"],
          touch: ["mute"]
        }
      };
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeInputMapping has been destroyed.");
      }
    }

    clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    normalizeAction(action) {
      if (typeof action !== "string") {
        return "";
      }

      return action.trim().toLowerCase();
    }

    normalizeDevice(device) {
      if (typeof device !== "string") {
        return "";
      }

      const normalized = device.trim().toLowerCase();

      return ["keyboard", "touch", "gamepad"].includes(normalized)
        ? normalized
        : "";
    }

    normalizeBindings(bindings) {
      if (!Array.isArray(bindings)) {
        return [];
      }

      return Array.from(
        new Set(
          bindings
            .filter((binding) => typeof binding === "string")
            .map((binding) => binding.trim())
            .filter(Boolean)
        )
      );
    }

    normalizeMapping(input) {
      const result = {};

      if (!input || typeof input !== "object" || Array.isArray(input)) {
        return result;
      }

      Object.entries(input).forEach(([action, devices]) => {
        const normalizedAction = this.normalizeAction(action);

        if (
          !normalizedAction ||
          !devices ||
          typeof devices !== "object" ||
          Array.isArray(devices)
        ) {
          return;
        }

        result[normalizedAction] = {};

        Object.entries(devices).forEach(([device, bindings]) => {
          const normalizedDevice = this.normalizeDevice(device);

          if (!normalizedDevice) {
            return;
          }

          result[normalizedAction][normalizedDevice] =
            this.normalizeBindings(bindings);
        });
      });

      return result;
    }

    setMapping(input, options) {
      this.assertAlive();

      const settings = options || {};
      const normalized = this.normalizeMapping(input);

      this.mapping = this.mergeMappings(this.defaults, normalized);

      if (!settings.silent) {
        this.emit("mapping-changed", {
          mapping: this.getMapping()
        });
      }

      return this.getMapping();
    }

    mergeMappings(defaults, overrides) {
      const result = this.clone(defaults);

      Object.entries(overrides).forEach(([action, devices]) => {
        if (!result[action]) {
          result[action] = {};
        }

        Object.entries(devices).forEach(([device, bindings]) => {
          result[action][device] = this.normalizeBindings(bindings);
        });
      });

      return result;
    }

    getMapping() {
      this.assertAlive();
      return this.clone(this.mapping);
    }

    getActions() {
      this.assertAlive();
      return Object.keys(this.mapping);
    }

    getBindings(action, device) {
      this.assertAlive();

      const normalizedAction = this.normalizeAction(action);
      const normalizedDevice = this.normalizeDevice(device);

      if (!normalizedAction || !normalizedDevice) {
        return [];
      }

      const bindings =
        this.mapping[normalizedAction] &&
        this.mapping[normalizedAction][normalizedDevice];

      return Array.isArray(bindings) ? bindings.slice() : [];
    }

    getActionForBinding(binding, device) {
      this.assertAlive();

      if (typeof binding !== "string" || !binding.trim()) {
        return null;
      }

      const normalizedBinding = binding.trim();
      const normalizedDevice = this.normalizeDevice(device);

      if (!normalizedDevice) {
        return null;
      }

      for (const [action, devices] of Object.entries(this.mapping)) {
        const bindings = devices[normalizedDevice] || [];

        if (bindings.includes(normalizedBinding)) {
          return action;
        }
      }

      return null;
    }

    hasConflict(action, binding, device) {
      this.assertAlive();

      const normalizedAction = this.normalizeAction(action);
      const normalizedDevice = this.normalizeDevice(device);

      if (
        !normalizedAction ||
        typeof binding !== "string" ||
        !binding.trim() ||
        !normalizedDevice
      ) {
        return false;
      }

      const normalizedBinding = binding.trim();

      for (const [existingAction, devices] of Object.entries(this.mapping)) {
        if (existingAction === normalizedAction) {
          continue;
        }

        const bindings = devices[normalizedDevice] || [];

        if (bindings.includes(normalizedBinding)) {
          return true;
        }
      }

      return false;
    }

    bind(action, binding, device, options) {
      this.assertAlive();

      const normalizedAction = this.normalizeAction(action);
      const normalizedDevice = this.normalizeDevice(device);
      const normalizedBinding =
        typeof binding === "string" ? binding.trim() : "";

      if (!normalizedAction || !normalizedDevice || !normalizedBinding) {
        throw new TypeError("A valid action, device, and binding are required.");
      }

      const settings = options || {};

      if (!this.mapping[normalizedAction]) {
        this.mapping[normalizedAction] = {};
      }

      if (!this.mapping[normalizedAction][normalizedDevice]) {
        this.mapping[normalizedAction][normalizedDevice] = [];
      }

      if (
        this.hasConflict(normalizedAction, normalizedBinding, normalizedDevice) &&
        settings.allowConflict !== true
      ) {
        return {
          success: false,
          conflict: true,
          action: normalizedAction,
          binding: normalizedBinding,
          device: normalizedDevice
        };
      }

      const bindings = this.mapping[normalizedAction][normalizedDevice];

      if (!settings.append) {
        this.mapping[normalizedAction][normalizedDevice] = [
          normalizedBinding
        ];
      } else if (!bindings.includes(normalizedBinding)) {
        bindings.push(normalizedBinding);
      }

      this.emit("binding-changed", {
        action: normalizedAction,
        binding: normalizedBinding,
        device: normalizedDevice
      });

      return {
        success: true,
        conflict: false,
        mapping: this.getMapping()
      };
    }

    unbind(action, binding, device) {
      this.assertAlive();

      const normalizedAction = this.normalizeAction(action);
      const normalizedDevice = this.normalizeDevice(device);

      if (!normalizedAction || !normalizedDevice) {
        return false;
      }

      const devices = this.mapping[normalizedAction];

      if (!devices || !Array.isArray(devices[normalizedDevice])) {
        return false;
      }

      const bindings = devices[normalizedDevice];
      const index = bindings.indexOf(binding);

      if (index === -1) {
        return false;
      }

      bindings.splice(index, 1);

      this.emit("binding-removed", {
        action: normalizedAction,
        binding,
        device: normalizedDevice
      });

      return true;
    }

    clearAction(action, device) {
      this.assertAlive();

      const normalizedAction = this.normalizeAction(action);
      const normalizedDevice = this.normalizeDevice(device);

      if (!normalizedAction || !normalizedDevice) {
        return false;
      }

      if (!this.mapping[normalizedAction]) {
        return false;
      }

      this.mapping[normalizedAction][normalizedDevice] = [];

      this.emit("action-cleared", {
        action: normalizedAction,
        device: normalizedDevice
      });

      return true;
    }

    reset(options) {
      this.assertAlive();

      this.mapping = this.clone(this.defaults);

      if (!(options && options.silent)) {
        this.emit("mapping-reset", {
          mapping: this.getMapping()
        });
      }

      return this.getMapping();
    }

    save() {
      this.assertAlive();

      if (!this.storage || typeof this.storage.set !== "function") {
        return {
          success: false,
          error: "Storage is unavailable."
        };
      }

      try {
        const result = this.storage.set(
          this.storageKey,
          this.mapping
        );

        const success = result === true ||
          Boolean(result && result.success !== false);

        this.emit("mapping-saved", {
          success
        });

        return {
          success,
          result
        };
      } catch (error) {
        this.emit("error", {
          operation: "save",
          message: error.message
        });

        return {
          success: false,
          error: error.message
        };
      }
    }

    load() {
      this.assertAlive();

      if (!this.storage || typeof this.storage.get !== "function") {
        return {
          success: false,
          error: "Storage is unavailable."
        };
      }

      try {
        const stored = this.storage.get(this.storageKey, null);

        if (!stored || typeof stored !== "object") {
          this.mapping = this.clone(this.defaults);

          return {
            success: true,
            loaded: false
          };
        }

        this.mapping = this.mergeMappings(
          this.defaults,
          this.normalizeMapping(stored)
        );

        this.emit("mapping-loaded", {
          mapping: this.getMapping()
        });

        return {
          success: true,
          loaded: true
        };
      } catch (error) {
        this.mapping = this.clone(this.defaults);

        this.emit("error", {
          operation: "load",
          message: error.message
        });

        return {
          success: false,
          error: error.message
        };
      }
    }

    exportMapping() {
      this.assertAlive();

      return {
        format: "snake-input-mapping",
        version: 1,
        exportedAt: new Date().toISOString(),
        mapping: this.getMapping()
      };
    }

    importMapping(payload, options) {
      this.assertAlive();

      if (
        !payload ||
        typeof payload !== "object" ||
        payload.format !== "snake-input-mapping" ||
        !payload.mapping ||
        typeof payload.mapping !== "object"
      ) {
        return {
          success: false,
          error: "Invalid input mapping format."
        };
      }

      this.setMapping(payload.mapping);

      if (options && options.save === true) {
        const result = this.save();

        if (!result.success) {
          return result;
        }
      }

      this.emit("mapping-imported", {});

      return {
        success: true,
        mapping: this.getMapping()
      };
    }

    on(eventName, callback) {
      this.assertAlive();

      if (typeof callback !== "function") {
        throw new TypeError("Callback must be a function.");
      }

      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, new Set());
      }

      this.listeners.get(eventName).add(callback);

      return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
      const callbacks = this.listeners.get(eventName);

      if (!callbacks) {
        return false;
      }

      const removed = callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.listeners.delete(eventName);
      }

      return removed;
    }

    emit(eventName, payload) {
      const callbacks = this.listeners.get(eventName);

      if (!callbacks) {
        return;
      }

      callbacks.forEach((callback) => {
        try {
          callback(payload || {});
        } catch (error) {
          if (global.console && typeof global.console.error === "function") {
            global.console.error("[SnakeInputMapping]", error);
          }
        }
      });
    }

    getState() {
      this.assertAlive();

      return {
        destroyed: this.destroyed,
        actionCount: Object.keys(this.mapping).length,
        listenerCount: Array.from(this.listeners.values()).reduce(
          (total, callbacks) => total + callbacks.size,
          0
        )
      };
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeInputMapping = SnakeInputMapping;
})(window);