(function (global) {
  "use strict";

  class SnakeInputManager {
    constructor(options) {
      const settings = options || {};

      this.target = settings.target || global.document;
      this.enabled = settings.enabled !== false;
      this.preventDefault = settings.preventDefault !== false;
      this.repeatDelay = Number(settings.repeatDelay) || 120;
      this.listeners = new Map();
      this.pressedKeys = new Set();
      this.destroyed = false;
      this.lastDirectionTime = 0;

      this.keydownHandler = this.handleKeyDown.bind(this);
      this.keyupHandler = this.handleKeyUp.bind(this);
      this.blurHandler = this.handleBlur.bind(this);
      this.visibilityHandler = this.handleVisibilityChange.bind(this);

      this.bindEvents();
    }

    bindEvents() {
      if (!this.target || typeof this.target.addEventListener !== "function") {
        return;
      }

      this.target.addEventListener("keydown", this.keydownHandler);
      this.target.addEventListener("keyup", this.keyupHandler);

      if (global.addEventListener) {
        global.addEventListener("blur", this.blurHandler);
      }

      if (global.document) {
        global.document.addEventListener(
          "visibilitychange",
          this.visibilityHandler
        );
      }
    }

    handleKeyDown(event) {
      if (!this.enabled || this.destroyed || !event) {
        return;
      }

      const key = this.normalizeKey(event.key);

      if (!key) {
        return;
      }

      if (this.isEditableTarget(event.target)) {
        return;
      }

      if (this.isGameKey(key) && this.preventDefault && event.cancelable) {
        event.preventDefault();
      }

      const alreadyPressed = this.pressedKeys.has(key);
      this.pressedKeys.add(key);

      this.emit("keydown", {
        key,
        code: event.code || "",
        repeat: Boolean(event.repeat || alreadyPressed),
        originalEvent: event
      });

      if (alreadyPressed || event.repeat) {
        return;
      }

      this.emit("action", {
        action: this.getAction(key),
        key,
        originalEvent: event
      });
    }

    handleKeyUp(event) {
      if (this.destroyed || !event) {
        return;
      }

      const key = this.normalizeKey(event.key);

      if (!key) {
        return;
      }

      const wasPressed = this.pressedKeys.has(key);
      this.pressedKeys.delete(key);

      this.emit("keyup", {
        key,
        code: event.code || "",
        wasPressed,
        originalEvent: event
      });
    }

    handleBlur() {
      this.releaseAllKeys();
      this.emit("blur", {});
    }

    handleVisibilityChange() {
      if (global.document && global.document.hidden) {
        this.releaseAllKeys();
        this.emit("hidden", {});
      } else {
        this.emit("visible", {});
      }
    }

    normalizeKey(key) {
      if (typeof key !== "string") {
        return "";
      }

      const normalized = key.trim().toLowerCase();

      const aliases = {
        arrowup: "up",
        arrowdown: "down",
        arrowleft: "left",
        arrowright: "right",
        " ": "space",
        esc: "escape",
        del: "delete"
      };

      return aliases[normalized] || normalized;
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
        tagName === "select" ||
        tagName === "button" && target.dataset &&
          target.dataset.inputCapture === "false"
      );
    }

    isGameKey(key) {
      return [
        "up",
        "down",
        "left",
        "right",
        "w",
        "a",
        "s",
        "d",
        "space",
        "escape",
        "enter",
        "p",
        "r",
        "m"
      ].includes(key);
    }

    getAction(key) {
      const actions = {
        up: "move-up",
        w: "move-up",
        down: "move-down",
        s: "move-down",
        left: "move-left",
        a: "move-left",
        right: "move-right",
        d: "move-right",
        space: "pause",
        escape: "pause",
        p: "pause",
        enter: "confirm",
        r: "restart",
        m: "toggle-mute"
      };

      return actions[key] || null;
    }

    on(eventName, callback) {
      if (this.destroyed) {
        throw new Error("SnakeInputManager has been destroyed.");
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
            global.console.error("[SnakeInputManager]", error);
          }
        }
      });
    }

    isPressed(key) {
      return this.pressedKeys.has(this.normalizeKey(key));
    }

    getPressedKeys() {
      return Array.from(this.pressedKeys);
    }

    releaseAllKeys() {
      const released = Array.from(this.pressedKeys);
      this.pressedKeys.clear();

      released.forEach((key) => {
        this.emit("keyup", {
          key,
          wasPressed: true,
          synthetic: true
        });
      });

      this.emit("all-keys-released", {
        keys: released
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
      this.releaseAllKeys();
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

    unbindEvents() {
      if (this.target && typeof this.target.removeEventListener === "function") {
        this.target.removeEventListener("keydown", this.keydownHandler);
        this.target.removeEventListener("keyup", this.keyupHandler);
      }

      if (global.removeEventListener) {
        global.removeEventListener("blur", this.blurHandler);
      }

      if (global.document) {
        global.document.removeEventListener(
          "visibilitychange",
          this.visibilityHandler
        );
      }
    }

    getState() {
      return {
        enabled: this.enabled,
        destroyed: this.destroyed,
        pressedKeys: this.getPressedKeys(),
        listenerCount: Array.from(this.listeners.values()).reduce(
          (count, callbacks) => count + callbacks.size,
          0
        )
      };
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.unbindEvents();
      this.releaseAllKeys();
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeInputManager = SnakeInputManager;
})(window);