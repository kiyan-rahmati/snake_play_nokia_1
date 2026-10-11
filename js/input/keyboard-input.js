(function (global) {
  "use strict";

  class SnakeKeyboardInput {
    constructor(options) {
      const settings = options || {};

      this.target = settings.target || global.document;
      this.enabled = settings.enabled !== false;
      this.preventDefault = settings.preventDefault !== false;
      this.keyMap = this.createDefaultKeyMap();
      this.listeners = new Map();
      this.pressedKeys = new Set();
      this.destroyed = false;
      this.inputManager = settings.inputManager || null;

      if (settings.keyMap) {
        this.setKeyMap(settings.keyMap);
      }

      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.handleBlur = this.handleBlur.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

      this.bindEvents();
    }

    createDefaultKeyMap() {
      return {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        KeyW: "up",
        KeyS: "down",
        KeyA: "left",
        KeyD: "right",
        Space: "pause",
        Escape: "pause",
        KeyP: "pause",
        KeyR: "restart",
        KeyM: "mute",
        Enter: "confirm"
      };
    }

    bindEvents() {
      if (!this.target || typeof this.target.addEventListener !== "function") {
        return;
      }

      this.target.addEventListener("keydown", this.handleKeyDown);
      this.target.addEventListener("keyup", this.handleKeyUp);

      if (global.addEventListener) {
        global.addEventListener("blur", this.handleBlur);
      }

      if (global.document) {
        global.document.addEventListener(
          "visibilitychange",
          this.handleVisibilityChange
        );
      }
    }

    unbindEvents() {
      if (this.target && typeof this.target.removeEventListener === "function") {
        this.target.removeEventListener("keydown", this.handleKeyDown);
        this.target.removeEventListener("keyup", this.handleKeyUp);
      }

      if (global.removeEventListener) {
        global.removeEventListener("blur", this.handleBlur);
      }

      if (global.document) {
        global.document.removeEventListener(
          "visibilitychange",
          this.handleVisibilityChange
        );
      }
    }

    isEditableTarget(target) {
      if (!target) {
        return false;
      }

      const tagName = String(target.tagName || "").toLowerCase();

      return (
        target.isContentEditable === true ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
    }

    resolveKey(event) {
      if (!event) {
        return "";
      }

      return event.code || event.key || "";
    }

    handleKeyDown(event) {
      if (!this.enabled || this.destroyed || !event) {
        return;
      }

      if (this.isEditableTarget(event.target)) {
        return;
      }

      const code = this.resolveKey(event);
      const action = this.keyMap[code];

      if (!action) {
        return;
      }

      if (this.preventDefault && event.cancelable) {
        event.preventDefault();
      }

      const alreadyPressed = this.pressedKeys.has(code);
      this.pressedKeys.add(code);

      if (alreadyPressed || event.repeat) {
        this.emit("repeat", {
          code,
          action,
          originalEvent: event
        });
        return;
      }

      const payload = {
        code,
        action,
        key: event.key || "",
        originalEvent: event,
        timestamp: Date.now()
      };

      this.emit("keydown", payload);
      this.emit("action", payload);

      if (this.inputManager && typeof this.inputManager.emit === "function") {
        this.inputManager.emit("keyboard-action", payload);
      }
    }

    handleKeyUp(event) {
      if (this.destroyed || !event) {
        return;
      }

      const code = this.resolveKey(event);
      const wasPressed = this.pressedKeys.delete(code);

      if (!wasPressed) {
        return;
      }

      this.emit("keyup", {
        code,
        action: this.keyMap[code] || null,
        key: event.key || "",
        originalEvent: event,
        timestamp: Date.now()
      });
    }

    handleBlur() {
      this.releaseAll();
      this.emit("blur", {});
    }

    handleVisibilityChange() {
      if (global.document && global.document.hidden) {
        this.releaseAll();
        this.emit("hidden", {});
      }
    }

    releaseAll() {
      const keys = Array.from(this.pressedKeys);
      this.pressedKeys.clear();

      keys.forEach((code) => {
        this.emit("keyup", {
          code,
          action: this.keyMap[code] || null,
          synthetic: true,
          timestamp: Date.now()
        });
      });

      this.emit("release-all", {
        keys
      });
    }

    setKeyMap(keyMap) {
      if (!keyMap || typeof keyMap !== "object" || Array.isArray(keyMap)) {
        throw new TypeError("Key map must be an object.");
      }

      const nextMap = {};

      Object.keys(keyMap).forEach((key) => {
        const action = keyMap[key];

        if (typeof action === "string" && action.trim()) {
          nextMap[key] = action.trim();
        }
      });

      this.keyMap = nextMap;
      this.emit("keymap-changed", {
        keyMap: this.getKeyMap()
      });

      return this;
    }

    bindKey(code, action) {
      if (typeof code !== "string" || !code.trim()) {
        throw new TypeError("A valid key code is required.");
      }

      if (typeof action !== "string" || !action.trim()) {
        throw new TypeError("A valid action is required.");
      }

      this.keyMap[code.trim()] = action.trim();

      this.emit("key-bound", {
        code: code.trim(),
        action: action.trim()
      });

      return true;
    }

    unbindKey(code) {
      if (!Object.prototype.hasOwnProperty.call(this.keyMap, code)) {
        return false;
      }

      delete this.keyMap[code];
      this.pressedKeys.delete(code);

      this.emit("key-unbound", {
        code
      });

      return true;
    }

    getKeyMap() {
      return Object.assign({}, this.keyMap);
    }

    getActionForKey(code) {
      return this.keyMap[code] || null;
    }

    isPressed(code) {
      return this.pressedKeys.has(code);
    }

    getPressedKeys() {
      return Array.from(this.pressedKeys);
    }

    on(eventName, callback) {
      if (this.destroyed) {
        throw new Error("SnakeKeyboardInput has been destroyed.");
      }

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
            global.console.error("[SnakeKeyboardInput]", error);
          }
        }
      });
    }

    enable() {
      if (this.destroyed) {
        return false;
      }

      this.enabled = true;
      this.emit("enabled", {});
      return true;
    }

    disable() {
      if (this.destroyed) {
        return false;
      }

      this.enabled = false;
      this.releaseAll();
      this.emit("disabled", {});
      return true;
    }

    setTarget(target) {
      if (this.destroyed) {
        return false;
      }

      this.unbindEvents();
      this.target = target || global.document;
      this.bindEvents();

      return true;
    }

    getState() {
      return {
        enabled: this.enabled,
        destroyed: this.destroyed,
        pressedKeys: this.getPressedKeys(),
        keyMap: this.getKeyMap(),
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

      this.unbindEvents();
      this.releaseAll();
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeKeyboardInput = SnakeKeyboardInput;
})(window);