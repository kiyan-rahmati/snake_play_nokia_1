(function (global) {
  "use strict";

  const DEFAULT_BINDINGS = Object.freeze({
    up: ["ArrowUp", "w", "W"],
    down: ["ArrowDown", "s", "S"],
    left: ["ArrowLeft", "a", "A"],
    right: ["ArrowRight", "d", "D"],
    pause: ["Escape", "p", "P"]
  });

  const ACTION_LABELS = Object.freeze({
    up: "Move Up",
    down: "Move Down",
    left: "Move Left",
    right: "Move Right",
    pause: "Pause Game"
  });

  class SnakeControlSettings {
    constructor(options) {
      const settings = options || {};

      this.settingsManager = settings.settingsManager || null;
      this.inputManager = settings.inputManager || null;

      this.root =
        typeof settings.root === "string"
          ? document.querySelector(settings.root)
          : settings.root || null;

      this.controlMode = "keyboard";
      this.keyBindings = this._clone(DEFAULT_BINDINGS);
      this.captureButton = null;
      this.captureAction = null;
      this.unsubscribeSettings = null;
      this.destroyed = false;

      this.handleChange = this.handleChange.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);

      if (settings.autoInit !== false) {
        this.initialize();
      }
    }

    initialize() {
      this._assertAlive();

      if (this.root) {
        this.root.addEventListener("change", this.handleChange);
        this.root.addEventListener("click", this.handleClick);
        this.root.addEventListener("keydown", this.handleKeyDown);
      }

      this._loadSettings();
      this._subscribeToSettings();
      this._renderBindings();

      return this;
    }

    _clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    _loadSettings() {
      if (!this.settingsManager) {
        return;
      }

      const mode = this.settingsManager.get("controlMode");
      const bindings = this.settingsManager.get("keyBindings");

      if (["keyboard", "touch", "mixed"].includes(mode)) {
        this.controlMode = mode;
      }

      if (bindings && typeof bindings === "object") {
        this.keyBindings = this._normalizeBindings(bindings);
      }
    }

    _normalizeBindings(bindings) {
      const normalized = {};

      for (const action of Object.keys(DEFAULT_BINDINGS)) {
        const value = bindings[action];

        normalized[action] =
          Array.isArray(value) && value.length > 0
            ? value.filter(
                (key) => typeof key === "string" && key.length > 0
              ).slice(0, 8)
            : this._clone(DEFAULT_BINDINGS[action]);
      }

      return normalized;
    }

    _subscribeToSettings() {
      if (
        !this.settingsManager ||
        typeof this.settingsManager.subscribe !== "function"
      ) {
        return;
      }

      this.unsubscribeSettings = this.settingsManager.subscribe((event) => {
        if (!event) {
          return;
        }

        if (event.type === "changed" && event.details) {
          if (event.details.key === "controlMode") {
            this.controlMode = event.details.value;
          }

          if (event.details.key === "keyBindings") {
            this.keyBindings = this._normalizeBindings(
              event.details.value || {}
            );
          }
        } else if (event.type === "reset" || event.type === "updated") {
          this._loadSettings();
        }

        this._renderBindings();
      });
    }

    handleChange(event) {
      this._assertAlive();

      const target = event.target;

      if (!target || target.dataset.controlSetting !== "mode") {
        return;
      }

      const mode = target.value;

      if (!["keyboard", "touch", "mixed"].includes(mode)) {
        this._renderBindings();
        return;
      }

      this.controlMode = mode;

      if (this.settingsManager) {
        this.settingsManager.set("controlMode", mode);
      }

      if (
        this.inputManager &&
        typeof this.inputManager.setControlMode === "function"
      ) {
        this.inputManager.setControlMode(mode);
      }

      this._renderBindings();
    }

    handleClick(event) {
      this._assertAlive();

      const button = event.target.closest("[data-control-action]");

      if (!button || !this.root || !this.root.contains(button)) {
        return;
      }

      const action = button.dataset.controlAction;

      if (!Object.prototype.hasOwnProperty.call(DEFAULT_BINDINGS, action)) {
        return;
      }

      event.preventDefault();
      this.beginCapture(action, button);
    }

    beginCapture(action, button) {
      this._assertAlive();

      if (!Object.prototype.hasOwnProperty.call(DEFAULT_BINDINGS, action)) {
        throw new Error("Unknown control action: " + action);
      }

      this.cancelCapture();

      this.captureAction = action;
      this.captureButton = button || null;

      if (this.captureButton) {
        this.captureButton.textContent = "Press a key…";
        this.captureButton.setAttribute("aria-pressed", "true");
      }

      if (this.root) {
        this.root.classList.add("is-capturing-control");
      }

      return true;
    }

    handleKeyDown(event) {
      if (!this.captureAction) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        this.cancelCapture();
        this._renderBindings();
        return;
      }

      if (
        event.key === "Shift" ||
        event.key === "Control" ||
        event.key === "Alt" ||
        event.key === "Meta"
      ) {
        return;
      }

      const action = this.captureAction;
      const key = event.key;

      if (!this._isKeyAvailable(action, key)) {
        if (this.captureButton) {
          this.captureButton.textContent = "Key already assigned";
        }
        return;
      }

      this.keyBindings[action] = [key];

      this.cancelCapture();
      this._saveBindings();
      this._renderBindings();
    }

    _isKeyAvailable(action, key) {
      const normalizedKey = key.toLowerCase();

      for (const [otherAction, keys] of Object.entries(this.keyBindings)) {
        if (otherAction === action) {
          continue;
        }

        if (
          keys.some(
            (existingKey) => existingKey.toLowerCase() === normalizedKey
          )
        ) {
          return false;
        }
      }

      return true;
    }

    cancelCapture() {
      if (this.captureButton) {
        this.captureButton.removeAttribute("aria-pressed");
      }

      this.captureButton = null;
      this.captureAction = null;

      if (this.root) {
        this.root.classList.remove("is-capturing-control");
      }
    }

    resetBindings() {
      this._assertAlive();

      this.cancelCapture();
      this.keyBindings = this._clone(DEFAULT_BINDINGS);

      this._saveBindings();
      this._renderBindings();

      return this.getBindings();
    }

    _saveBindings() {
      if (this.settingsManager) {
        this.settingsManager.set(
          "keyBindings",
          this._clone(this.keyBindings)
        );
      }

      if (
        this.inputManager &&
        typeof this.inputManager.setKeyBindings === "function"
      ) {
        this.inputManager.setKeyBindings(this.getBindings());
      }
    }

    _renderBindings() {
      if (!this.root) {
        return;
      }

      const modeControl = this.root.querySelector(
        '[data-control-setting="mode"]'
      );

      if (modeControl) {
        modeControl.value = this.controlMode;
      }

      for (const [action, label] of Object.entries(ACTION_LABELS)) {
        const button = this.root.querySelector(
          '[data-control-action="' + action + '"]'
        );

        if (!button || button === this.captureButton) {
          continue;
        }

        const keys = this.keyBindings[action] || [];
        button.textContent = keys.map((key) => this._formatKey(key)).join(" / ");
        button.setAttribute(
          "aria-label",
          label + ": " + (keys.join(", ") || "Unassigned")
        );
      }
    }

    _formatKey(key) {
      const labels = {
        ArrowUp: "↑",
        ArrowDown: "↓",
        ArrowLeft: "←",
        ArrowRight: "→",
        " ": "Space",
        Escape: "Esc"
      };

      return labels[key] || key;
    }

    getBindings() {
      this._assertAlive();
      return this._clone(this.keyBindings);
    }

    getControlMode() {
      this._assertAlive();
      return this.controlMode;
    }

    setControlMode(mode) {
      this._assertAlive();

      if (!["keyboard", "touch", "mixed"].includes(mode)) {
        throw new TypeError("Invalid control mode.");
      }

      this.controlMode = mode;

      if (this.settingsManager) {
        this.settingsManager.set("controlMode", mode);
      }

      if (
        this.inputManager &&
        typeof this.inputManager.setControlMode === "function"
      ) {
        this.inputManager.setControlMode(mode);
      }

      this._renderBindings();

      return mode;
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeControlSettings has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.cancelCapture();

      if (this.root) {
        this.root.removeEventListener("change", this.handleChange);
        this.root.removeEventListener("click", this.handleClick);
        this.root.removeEventListener("keydown", this.handleKeyDown);
      }

      if (typeof this.unsubscribeSettings === "function") {
        this.unsubscribeSettings();
      }

      this.unsubscribeSettings = null;
      this.root = null;
      this.settingsManager = null;
      this.inputManager = null;
      this.destroyed = true;
    }
  }

  global.SnakeControlSettings = SnakeControlSettings;
  global.SnakeDefaultKeyBindings = DEFAULT_BINDINGS;
})(window);