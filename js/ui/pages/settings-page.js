(function (global) {
  "use strict";

  const SnakeSettingsPage = {
    root: null,
    elements: {},
    initialized: false,
    unsubscribe: [],

    defaults: {
      theme: "night",
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 0.7,
      musicVolume: 0.5,
      controlMode: "keyboard",
      gridEnabled: true,
      showFPS: false,
      screenShake: true,
      reducedMotion: false,
      highContrast: false,
      language: "en",
      vibrationEnabled: true
    },

    settings: {},

    init(root) {
      if (this.initialized) {
        if (root) this.root = root;
        return this;
      }

      this.root = root || document.querySelector("[data-page='settings']");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.page = "settings";
        this.root.className = "settings-page";
      }

      this.settings = Object.assign({}, this.defaults);

      this.render();
      this.cacheElements();
      this.bindEvents();
      this.loadSettings();
      this.applySettings();

      this.initialized = true;
      return this;
    },

    render() {
      this.root.innerHTML = `
        <section class="settings-layout">
          <header class="settings-header">
            <button type="button" class="settings-back-button" data-action="back">
              <span aria-hidden="true">←</span>
              <span data-i18n="settings.back">Back</span>
            </button>

            <div>
              <p class="settings-eyebrow">PERSONALIZE YOUR GAME</p>
              <h1 data-i18n="settings.title">Settings</h1>
              <p class="settings-description">
                Make the game feel right for you.
              </p>
            </div>

            <button type="button" data-action="reset">
              Restore Defaults
            </button>
          </header>

          <form class="settings-form" data-settings-form>
            <section class="settings-section">
              <header class="settings-section-header">
                <span class="settings-section-icon" aria-hidden="true">◐</span>
                <div>
                  <h2>Appearance</h2>
                  <p>Choose how your game looks.</p>
                </div>
              </header>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-theme">Theme</label>
                  <p>Switch between day and night styles.</p>
                </div>

                <select id="settings-theme" name="theme">
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-language">Language</label>
                  <p>Choose the interface language.</p>
                </div>

                <select id="settings-language" name="language">
                  <option value="en">English</option>
                  <option value="fa">فارسی</option>
                </select>
              </div>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-grid">Show grid</label>
                  <p>Display grid lines on the game board.</p>
                </div>

                <input
                  id="settings-grid"
                  name="gridEnabled"
                  type="checkbox"
                />
              </div>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-contrast">High contrast</label>
                  <p>Increase contrast between game elements.</p>
                </div>

                <input
                  id="settings-contrast"
                  name="highContrast"
                  type="checkbox"
                />
              </div>
            </section>

            <section class="settings-section">
              <header class="settings-section-header">
                <span class="settings-section-icon" aria-hidden="true">♫</span>
                <div>
                  <h2>Audio</h2>
                  <p>Control music and game sounds.</p>
                </div>
              </header>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-sound">Sound effects</label>
                  <p>Enable or disable game sound effects.</p>
                </div>

                <input
                  id="settings-sound"
                  name="soundEnabled"
                  type="checkbox"
                />
              </div>

              <div class="settings-row settings-volume-row">
                <div class="settings-row-copy">
                  <label for="settings-sound-volume">Sound volume</label>
                  <p>Adjust the volume of game effects.</p>
                </div>

                <div class="settings-volume-control">
                  <input
                    id="settings-sound-volume"
                    name="soundVolume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <output data-volume-output="soundVolume">70%</output>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-music">Background music</label>
                  <p>Play music while you explore the game.</p>
                </div>

                <input
                  id="settings-music"
                  name="musicEnabled"
                  type="checkbox"
                />
              </div>

              <div class="settings-row settings-volume-row">
                <div class="settings-row-copy">
                  <label for="settings-music-volume">Music volume</label>
                  <p>Adjust the background music volume.</p>
                </div>

                <div class="settings-volume-control">
                  <input
                    id="settings-music-volume"
                    name="musicVolume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                  />
                  <output data-volume-output="musicVolume">50%</output>
                </div>
              </div>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-vibration">Vibration</label>
                  <p>Enable vibration on supported devices.</p>
                </div>

                <input
                  id="settings-vibration"
                  name="vibrationEnabled"
                  type="checkbox"
                />
              </div>
            </section>

            <section class="settings-section">
              <header class="settings-section-header">
                <span class="settings-section-icon" aria-hidden="true">⌨</span>
                <div>
                  <h2>Controls</h2>
                  <p>Pick your preferred way to move.</p>
                </div>
              </header>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-controls">Control method</label>
                  <p>Select your primary input method.</p>
                </div>

                <select id="settings-controls" name="controlMode">
                  <option value="keyboard">Keyboard</option>
                  <option value="touch">Touch</option>
                  <option value="buttons">On-screen buttons</option>
                </select>
              </div>
            </section>

            <section class="settings-section">
              <header class="settings-section-header">
                <span class="settings-section-icon" aria-hidden="true">⚙</span>
                <div>
                  <h2>Gameplay</h2>
                  <p>Adjust gameplay and performance preferences.</p>
                </div>
              </header>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-shake">Screen shake</label>
                  <p>Show a small screen effect on important events.</p>
                </div>

                <input
                  id="settings-shake"
                  name="screenShake"
                  type="checkbox"
                />
              </div>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-fps">Show FPS</label>
                  <p>Display the approximate rendering frame rate.</p>
                </div>

                <input
                  id="settings-fps"
                  name="showFPS"
                  type="checkbox"
                />
              </div>

              <div class="settings-row">
                <div class="settings-row-copy">
                  <label for="settings-motion">Reduce motion</label>
                  <p>Reduce visual movement and transition effects.</p>
                </div>

                <input
                  id="settings-motion"
                  name="reducedMotion"
                  type="checkbox"
                />
              </div>
            </section>

            <footer class="settings-footer">
              <p data-settings-status aria-live="polite">Settings loaded.</p>

              <div class="settings-footer-actions">
                <button type="button" data-action="cancel">
                  Cancel Changes
                </button>

                <button type="submit" class="settings-save-button">
                  Save Settings
                </button>
              </div>
            </footer>
          </form>
        </section>
      `;
    },

    cacheElements() {
      this.elements = {
        form: this.root.querySelector("[data-settings-form]"),
        status: this.root.querySelector("[data-settings-status]"),
        backButton: this.root.querySelector("[data-action='back']"),
        controls: {},
        volumeOutputs: {}
      };

      Object.keys(this.defaults).forEach((key) => {
        this.elements.controls[key] = this.elements.form.elements.namedItem(key);
      });

      this.elements.volumeOutputs.soundVolume =
        this.root.querySelector("[data-volume-output='soundVolume']");

      this.elements.volumeOutputs.musicVolume =
        this.root.querySelector("[data-volume-output='musicVolume']");
    },

    bindEvents() {
      this.handleClick = this.handleClick.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.handleChange = this.handleChange.bind(this);
      this.handleInput = this.handleInput.bind(this);

      this.root.addEventListener("click", this.handleClick);
      this.elements.form.addEventListener("submit", this.handleSubmit);
      this.elements.form.addEventListener("change", this.handleChange);
      this.elements.form.addEventListener("input", this.handleInput);

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.on === "function") {
        const callback = () => {
          this.loadSettings();
          this.syncForm();
        };

        const result = bus.on("settings:changed", callback);

        if (typeof result === "function") {
          this.unsubscribe.push(result);
        } else if (typeof bus.off === "function") {
          this.unsubscribe.push(() => bus.off("settings:changed", callback));
        }
      }
    },

    handleClick(event) {
      const button = event.target.closest("[data-action]");

      if (!button || !this.root.contains(button)) return;

      switch (button.dataset.action) {
        case "back":
          this.navigateBack();
          break;

        case "reset":
          this.resetDefaults();
          break;

        case "cancel":
          this.loadSettings();
          this.syncForm();
          this.setStatus("Changes discarded.");
          break;

        default:
          break;
      }
    },

    handleSubmit(event) {
      event.preventDefault();

      this.readForm();
      this.saveSettings();
      this.applySettings();
      this.setStatus("Settings saved.");
      this.emit("settings:saved", Object.assign({}, this.settings));
    },

    handleChange(event) {
      const control = event.target;

      if (!control.name || !Object.prototype.hasOwnProperty.call(
        this.defaults,
        control.name
      )) {
        return;
      }

      if (control.name === "theme") {
        this.applyTheme(control.value);
      }

      if (control.name === "language") {
        this.applyLanguage(control.value);
      }

      if (control.name === "soundEnabled") {
        this.applySoundEnabled(control.checked);
      }

      if (control.name === "musicEnabled") {
        this.applyMusicEnabled(control.checked);
      }

      if (control.name === "controlMode") {
        this.applyControlMode(control.value);
      }

      if (
        control.name === "gridEnabled" ||
        control.name === "showFPS" ||
        control.name === "screenShake" ||
        control.name === "reducedMotion" ||
        control.name === "highContrast" ||
        control.name === "vibrationEnabled"
      ) {
        this.applyDisplaySettings();
      }

      if (
        control.name === "soundVolume" ||
        control.name === "musicVolume"
      ) {
        this.updateVolumeOutput(control.name);
      }

      this.readForm();
      this.setStatus("Unsaved changes.");
    },

    handleInput(event) {
      const name = event.target.name;

      if (name === "soundVolume" || name === "musicVolume") {
        this.updateVolumeOutput(name);
      }
    },

    readForm() {
      Object.keys(this.defaults).forEach((key) => {
        const control = this.elements.controls[key];

        if (!control) return;

        if (control.type === "checkbox") {
          this.settings[key] = control.checked;
        } else if (control.type === "range") {
          const value = Number(control.value);
          this.settings[key] = Number.isFinite(value)
            ? Math.min(1, Math.max(0, value))
            : this.defaults[key];
        } else {
          this.settings[key] = control.value;
        }
      });

      return this.settings;
    },

    syncForm() {
      Object.keys(this.defaults).forEach((key) => {
        const control = this.elements.controls[key];

        if (!control) return;

        if (control.type === "checkbox") {
          control.checked = Boolean(this.settings[key]);
        } else {
          control.value = String(this.settings[key]);
        }

        if (control.type === "range") {
          this.updateVolumeOutput(key);
        }
      });
    },

    loadSettings() {
      const manager = global.SnakeSettingsManager;

      if (manager) {
        try {
          let stored = null;

          if (typeof manager.getAll === "function") {
            stored = manager.getAll();
          } else if (typeof manager.getSettings === "function") {
            stored = manager.getSettings();
          }

          if (stored && typeof stored === "object") {
            this.settings = this.normalizeSettings(stored);
            return;
          }
        } catch (_) {
          // Fall back to browser storage.
        }
      }

      try {
        const raw = global.localStorage.getItem("snake-settings");

        if (raw) {
          const stored = JSON.parse(raw);

          if (stored && typeof stored === "object") {
            this.settings = this.normalizeSettings(stored);
            return;
          }
        }
      } catch (_) {
        // Storage may be unavailable or malformed.
      }

      this.settings = Object.assign({}, this.defaults);
    },

    normalizeSettings(source) {
      const normalized = Object.assign({}, this.defaults);

      Object.keys(this.defaults).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(source, key)) return;

        const value = source[key];
        const defaultValue = this.defaults[key];

        if (typeof defaultValue === "boolean" && typeof value === "boolean") {
          normalized[key] = value;
          return;
        }

        if (typeof defaultValue === "number" && Number.isFinite(value)) {
          normalized[key] = Math.min(1, Math.max(0, value));
          return;
        }

        if (typeof defaultValue === "string" && typeof value === "string") {
          normalized[key] = value;
        }
      });

      if (!["day", "night", "system"].includes(normalized.theme)) {
        normalized.theme = this.defaults.theme;
      }

      if (!["en", "fa"].includes(normalized.language)) {
        normalized.language = this.defaults.language;
      }

      if (!["keyboard", "touch", "buttons"].includes(normalized.controlMode)) {
        normalized.controlMode = this.defaults.controlMode;
      }

      return normalized;
    },

    saveSettings() {
      const manager = global.SnakeSettingsManager;
      const settingsCopy = Object.assign({}, this.settings);

      if (manager) {
        try {
          if (typeof manager.updateMany === "function") {
            manager.updateMany(settingsCopy);
          } else if (typeof manager.save === "function") {
            manager.save(settingsCopy);
          } else if (typeof manager.setAll === "function") {
            manager.setAll(settingsCopy);
          } else if (typeof manager.set === "function") {
            Object.keys(settingsCopy).forEach((key) => {
              manager.set(key, settingsCopy[key]);
            });
          }
        } catch (_) {
          // Continue with local storage.
        }
      }

      try {
        global.localStorage.setItem("snake-settings", JSON.stringify(settingsCopy));
      } catch (_) {
        // Storage may be unavailable or full.
      }
    },

    applySettings() {
      this.syncForm();
      this.applyTheme(this.settings.theme);
      this.applyLanguage(this.settings.language);
      this.applySoundEnabled(this.settings.soundEnabled);
      this.applyMusicEnabled(this.settings.musicEnabled);
      this.applyControlMode(this.settings.controlMode);
      this.applyDisplaySettings();
      this.applyVolumeSettings();
    },

    applyTheme(theme) {
      const manager = global.SnakeThemeManager;

      if (manager) {
        if (typeof manager.setTheme === "function") {
          manager.setTheme(theme);
          return;
        }

        if (typeof manager.apply === "function") {
          manager.apply(theme);
          return;
        }
      }

      const resolvedTheme = theme === "system"
        ? this.getSystemTheme()
        : theme;

      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.classList.toggle("theme-day", resolvedTheme === "day");
      document.documentElement.classList.toggle("theme-night", resolvedTheme === "night");
    },

    getSystemTheme() {
      if (
        global.matchMedia &&
        global.matchMedia("(prefers-color-scheme: light)").matches
      ) {
        return "day";
      }

      return "night";
    },

    applyLanguage(language) {
      const manager = global.SnakeLanguageManager;

      if (manager && typeof manager.setLanguage === "function") {
        manager.setLanguage(language);
        return;
      }

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.emit === "function") {
        bus.emit("language:change", { language });
      }

      document.documentElement.lang = language;
      document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
    },

    applySoundEnabled(enabled) {
      const manager = global.SnakeAudioManager;

      if (!manager) return;

      if (typeof manager.setSoundEnabled === "function") {
        manager.setSoundEnabled(enabled);
      } else if (typeof manager.setEffectsEnabled === "function") {
        manager.setEffectsEnabled(enabled);
      }
    },

    applyMusicEnabled(enabled) {
      const player = global.SnakeMusicPlayer;
      const audio = global.SnakeAudioManager;

      if (player) {
        if (enabled && typeof player.resume === "function") {
          player.resume();
        } else if (!enabled && typeof player.pause === "function") {
          player.pause();
        } else if (typeof player.setEnabled === "function") {
          player.setEnabled(enabled);
        }
      }

      if (audio && typeof audio.setMusicEnabled === "function") {
        audio.setMusicEnabled(enabled);
      }
    },

    applyControlMode(mode) {
      const manager = global.SnakeControlSettings;

      if (manager && typeof manager.setControlMode === "function") {
        manager.setControlMode(mode);
      }

      const input = global.SnakeInputManager;

      if (input && typeof input.setMode === "function") {
        input.setMode(mode);
      }

      this.root.dataset.controlMode = mode;
    },

    applyDisplaySettings() {
      const root = document.documentElement;

      root.classList.toggle("show-grid", Boolean(this.settings.gridEnabled));
      root.classList.toggle("high-contrast", Boolean(this.settings.highContrast));
      root.classList.toggle("reduced-motion", Boolean(this.settings.reducedMotion));

      const effects = global.SnakeEffectsRenderer;

      if (effects && typeof effects.setScreenShakeEnabled === "function") {
        effects.setScreenShakeEnabled(Boolean(this.settings.screenShake));
      }

      const renderer = global.SnakeRenderer || global.SnakeCanvasRenderer;

      if (renderer && typeof renderer.setGridEnabled === "function") {
        renderer.setGridEnabled(Boolean(this.settings.gridEnabled));
      }

      if (renderer && typeof renderer.setShowFPS === "function") {
        renderer.setShowFPS(Boolean(this.settings.showFPS));
      }

      if (renderer && typeof renderer.setReducedMotion === "function") {
        renderer.setReducedMotion(Boolean(this.settings.reducedMotion));
      }

      const accessibility = global.SnakeAccessibilitySettings;

      if (accessibility) {
        if (typeof accessibility.setReducedMotion === "function") {
          accessibility.setReducedMotion(Boolean(this.settings.reducedMotion));
        }

        if (typeof accessibility.setHighContrast === "function") {
          accessibility.setHighContrast(Boolean(this.settings.highContrast));
        }
      }

      const vibration = global.SnakeSoundEffects;

      if (vibration && typeof vibration.setVibrationEnabled === "function") {
        vibration.setVibrationEnabled(Boolean(this.settings.vibrationEnabled));
      }
    },

    applyVolumeSettings() {
      const audio = global.SnakeAudioManager;

      if (audio && typeof audio.setSoundVolume === "function") {
        audio.setSoundVolume(this.settings.soundVolume);
      }

      if (audio && typeof audio.setMusicVolume === "function") {
        audio.setMusicVolume(this.settings.musicVolume);
      }

      const player = global.SnakeMusicPlayer;

      if (player && typeof player.setVolume === "function") {
        player.setVolume(this.settings.musicVolume);
      }

      this.updateVolumeOutput("soundVolume");
      this.updateVolumeOutput("musicVolume");
    },

    updateVolumeOutput(key) {
      const output = this.elements.volumeOutputs[key];
      const control = this.elements.controls[key];

      if (!output || !control) return;

      const percentage = Math.round(Number(control.value) * 100);
      output.value = percentage + "%";
      output.textContent = percentage + "%";
    },

    resetDefaults() {
      this.settings = Object.assign({}, this.defaults);
      this.syncForm();
      this.applySettings();
      this.saveSettings();
      this.setStatus("Default settings restored.");
      this.emit("settings:reset", Object.assign({}, this.settings));
    },

    setStatus(message) {
      if (this.elements.status) {
        this.elements.status.textContent = message;
      }
    },

    navigateBack() {
      const router = global.SnakeRouter;

      if (router && typeof router.navigate === "function") {
        router.navigate("home");
        return;
      }

      if (router && typeof router.go === "function") {
        router.go("home");
        return;
      }

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.emit === "function") {
        bus.emit("navigation:request", { page: "home" });
      }
    },

    emit(eventName, payload) {
      const bus = global.SnakeEventBus;

      if (bus && typeof bus.emit === "function") {
        bus.emit(eventName, payload);
      }
    },

    destroy() {
      if (this.root) {
        this.root.removeEventListener("click", this.handleClick);
      }

      if (this.elements.form) {
        this.elements.form.removeEventListener("submit", this.handleSubmit);
        this.elements.form.removeEventListener("change", this.handleChange);
        this.elements.form.removeEventListener("input", this.handleInput);
      }

      this.unsubscribe.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (_) {
          // Ignore cleanup errors.
        }
      });

      this.unsubscribe = [];
      this.elements = {};
      this.initialized = false;
      this.root = null;
    }
  };

  global.SnakeSettingsPage = SnakeSettingsPage;
})(window);