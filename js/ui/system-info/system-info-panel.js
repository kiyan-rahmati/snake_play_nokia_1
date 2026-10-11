(function (global) {
  "use strict";

  const SnakeSystemInfoPanel = {
    root: null,
    controller: null,
    view: null,
    privacyConsent: null,
    initialized: false,
    visible: false,
    refreshTimer: null,
    refreshInterval: 60000,
    subscriptions: [],
    handlers: {},
    state: {
      loading: false,
      error: null,
      lastUpdated: null,
      data: {},
      sections: {
        browser: true,
        device: true,
        platform: true,
        screen: true,
        network: true
      }
    },

    init(options) {
      options = options || {};

      if (this.initialized) return this;

      this.root =
        options.root ||
        document.querySelector("[data-system-info-panel]");

      this.controller =
        options.controller ||
        global.SnakeSystemInfoController ||
        null;

      this.view =
        options.view ||
        global.SnakeSystemInfoView ||
        null;

      this.privacyConsent =
        options.privacyConsent ||
        global.SnakePrivacyConsent ||
        null;

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.systemInfoPanel = "";
        this.root.className = "system-info-panel";
        this.root.hidden = true;

        const host =
          document.querySelector("[data-system-info-container]") ||
          document.querySelector("main") ||
          document.body;

        host.appendChild(this.root);
      }

      this.root.setAttribute("aria-labelledby", "system-info-title");
      this.root.setAttribute("aria-describedby", "system-info-description");

      this.render();
      this.bindEvents();
      this.initialized = true;

      if (options.autoRefresh !== false) {
        this.startAutoRefresh(options.refreshInterval);
      }

      return this;
    },

    render() {
      this.root.innerHTML = `
        <div class="system-info-panel-inner">
          <header class="system-info-header">
            <div class="system-info-heading">
              <p class="system-info-eyebrow">DEVICE DIAGNOSTICS</p>
              <h2 id="system-info-title">System Information</h2>
              <p id="system-info-description">
                Information about this browser and device.
              </p>
            </div>

            <div class="system-info-header-actions">
              <button
                type="button"
                data-system-info-action="refresh"
                aria-label="Refresh system information"
              >↻</button>

              <button
                type="button"
                data-system-info-action="close"
                aria-label="Close system information"
              >×</button>
            </div>
          </header>

          <div
            class="system-info-status"
            data-system-info-status
            role="status"
            aria-live="polite"
          >Ready</div>

          <div class="system-info-error" data-system-info-error role="alert" hidden></div>

          <div class="system-info-sections">
            <section class="system-info-section" data-info-section="browser">
              <button
                type="button"
                class="system-info-section-toggle"
                data-system-info-toggle="browser"
                aria-expanded="true"
              >
                <span class="system-info-section-icon" aria-hidden="true">◈</span>
                <span>Browser</span>
                <span class="system-info-section-chevron" aria-hidden="true">⌄</span>
              </button>
              <dl class="system-info-values" data-system-info-values="browser"></dl>
            </section>

            <section class="system-info-section" data-info-section="device">
              <button
                type="button"
                class="system-info-section-toggle"
                data-system-info-toggle="device"
                aria-expanded="true"
              >
                <span class="system-info-section-icon" aria-hidden="true">▣</span>
                <span>Device</span>
                <span class="system-info-section-chevron" aria-hidden="true">⌄</span>
              </button>
              <dl class="system-info-values" data-system-info-values="device"></dl>
            </section>

            <section class="system-info-section" data-info-section="platform">
              <button
                type="button"
                class="system-info-section-toggle"
                data-system-info-toggle="platform"
                aria-expanded="true"
              >
                <span class="system-info-section-icon" aria-hidden="true">⌘</span>
                <span>Platform</span>
                <span class="system-info-section-chevron" aria-hidden="true">⌄</span>
              </button>
              <dl class="system-info-values" data-system-info-values="platform"></dl>
            </section>

            <section class="system-info-section" data-info-section="screen">
              <button
                type="button"
                class="system-info-section-toggle"
                data-system-info-toggle="screen"
                aria-expanded="true"
              >
                <span class="system-info-section-icon" aria-hidden="true">▤</span>
                <span>Display</span>
                <span class="system-info-section-chevron" aria-hidden="true">⌄</span>
              </button>
              <dl class="system-info-values" data-system-info-values="screen"></dl>
            </section>

            <section class="system-info-section" data-info-section="network">
              <button
                type="button"
                class="system-info-section-toggle"
                data-system-info-toggle="network"
                aria-expanded="true"
              >
                <span class="system-info-section-icon" aria-hidden="true">⌁</span>
                <span>Network</span>
                <span class="system-info-section-chevron" aria-hidden="true">⌄</span>
              </button>
              <dl class="system-info-values" data-system-info-values="network"></dl>
            </section>
          </div>

          <footer class="system-info-footer">
            <span data-system-info-updated>Not updated yet</span>
            <button type="button" data-system-info-action="privacy">
              Privacy settings
            </button>
          </footer>
        </div>
      `;

      this.renderValues();
    },

    bindEvents() {
      if (this.handlers.click) return;

      this.handlers.click = (event) => {
        const actionButton = event.target.closest(
          "[data-system-info-action]"
        );

        if (actionButton && this.root.contains(actionButton)) {
          this.handleAction(actionButton.dataset.systemInfoAction);
          return;
        }

        const toggleButton = event.target.closest(
          "[data-system-info-toggle]"
        );

        if (toggleButton && this.root.contains(toggleButton)) {
          this.toggleSection(toggleButton.dataset.systemInfoToggle);
        }
      };

      this.handlers.online = () => {
        this.updateNetworkStatus();
      };

      this.handlers.offline = () => {
        this.updateNetworkStatus();
      };

      this.root.addEventListener("click", this.handlers.click);
      global.addEventListener("online", this.handlers.online);
      global.addEventListener("offline", this.handlers.offline);
    },

    handleAction(action) {
      switch (action) {
        case "refresh":
          this.refresh();
          break;

        case "close":
          this.hide();
          break;

        case "privacy":
          this.openPrivacySettings();
          break;

        default:
          break;
      }
    },

    show(options) {
      options = options || {};

      if (!this.initialized) {
        this.init(options);
      }

      this.visible = true;
      this.root.hidden = false;
      this.root.classList.add("is-visible");
      this.root.setAttribute("aria-hidden", "false");

      this.refresh();

      this.emit("system-info:shown");

      return this;
    },

    hide() {
      if (!this.root || !this.visible) return;

      this.visible = false;
      this.root.hidden = true;
      this.root.classList.remove("is-visible");
      this.root.setAttribute("aria-hidden", "true");

      this.emit("system-info:hidden");
    },

    toggle() {
      return this.visible ? this.hide() : this.show();
    },

    async refresh() {
      if (this.state.loading) return this.state.data;

      this.state.loading = true;
      this.state.error = null;

      this.updateStatus("Refreshing system information…");
      this.renderError();

      try {
        const data = await this.collectInformation();

        this.state.data = this.normalizeData(data);
        this.state.lastUpdated = new Date();

        this.renderValues();
        this.renderUpdatedAt();
        this.updateStatus("System information updated");

        this.emit("system-info:updated", {
          data: this.state.data,
          updatedAt: this.state.lastUpdated
        });

        return this.state.data;
      } catch (error) {
        this.state.error = this.safeText(
          error && error.message || "Unable to retrieve system information."
        );

        this.renderError();
        this.updateStatus("Update failed");

        this.emit("system-info:error", {
          message: this.state.error
        });

        return this.state.data;
      } finally {
        this.state.loading = false;
        this.updateRefreshButton();
      }
    },

    async collectInformation() {
      if (
        this.controller &&
        typeof this.controller.getSystemInfo === "function"
      ) {
        return this.controller.getSystemInfo();
      }

      if (
        this.controller &&
        typeof this.controller.collect === "function"
      ) {
        return this.controller.collect();
      }

      const data = {};

      data.browser = this.getBrowserInfo();
      data.device = this.getDeviceInfo();
      data.platform = this.getPlatformInfo();
      data.screen = this.getScreenInfo();
      data.network = this.getNetworkInfo();

      return data;
    },

    getBrowserInfo() {
      const navigatorObject = global.navigator || {};

      return {
        userAgent: navigatorObject.userAgent || "Unavailable",
        language: navigatorObject.language || "Unavailable",
        languages: Array.isArray(navigatorObject.languages)
          ? navigatorObject.languages.join(", ")
          : "Unavailable",
        cookiesEnabled: typeof navigatorObject.cookieEnabled === "boolean"
          ? navigatorObject.cookieEnabled
          : "Unknown",
        online: typeof navigatorObject.onLine === "boolean"
          ? navigatorObject.onLine
          : "Unknown"
      };
    },

    getDeviceInfo() {
      const navigatorObject = global.navigator || {};
      const connection =
        navigatorObject.connection ||
        navigatorObject.mozConnection ||
        navigatorObject.webkitConnection ||
        null;

      return {
        platform: navigatorObject.platform || "Unavailable",
        hardwareConcurrency: navigatorObject.hardwareConcurrency || "Unknown",
        deviceMemory: navigatorObject.deviceMemory
          ? navigatorObject.deviceMemory + " GB"
          : "Unavailable",
        touchPoints: Number.isFinite(navigatorObject.maxTouchPoints)
          ? navigatorObject.maxTouchPoints
          : 0,
        connectionType: connection && connection.effectiveType
          ? connection.effectiveType
          : "Unavailable"
      };
    },

    getPlatformInfo() {
      const navigatorObject = global.navigator || {};
      const documentObject = global.document || {};

      return {
        platform: navigatorObject.platform || "Unavailable",
        timezone: this.getTimezone(),
        timezoneOffset: this.getTimezoneOffset(),
        colorScheme: this.getColorScheme(),
        reducedMotion: this.getReducedMotion(),
        visibility: documentObject.visibilityState || "Unavailable"
      };
    },

    getScreenInfo() {
      const screenObject = global.screen || {};

      return {
        resolution: screenObject.width && screenObject.height
          ? screenObject.width + " × " + screenObject.height
          : "Unavailable",
        availableResolution: screenObject.availWidth && screenObject.availHeight
          ? screenObject.availWidth + " × " + screenObject.availHeight
          : "Unavailable",
        viewport: global.innerWidth && global.innerHeight
          ? global.innerWidth + " × " + global.innerHeight
          : "Unavailable",
        pixelRatio: global.devicePixelRatio || 1,
        orientation: screenObject.orientation &&
          screenObject.orientation.type
            ? screenObject.orientation.type
            : "Unavailable",
        colorDepth: screenObject.colorDepth
          ? screenObject.colorDepth + " bit"
          : "Unavailable"
      };
    },

    getNetworkInfo() {
      const navigatorObject = global.navigator || {};
      const connection =
        navigatorObject.connection ||
        navigatorObject.mozConnection ||
        navigatorObject.webkitConnection ||
        null;

      return {
        status: navigatorObject.onLine === false ? "Offline" : "Online",
        effectiveType: connection && connection.effectiveType
          ? connection.effectiveType
          : "Unavailable",
        downlink: connection && Number.isFinite(connection.downlink)
          ? connection.downlink + " Mbps"
          : "Unavailable",
        rtt: connection && Number.isFinite(connection.rtt)
          ? connection.rtt + " ms"
          : "Unavailable",
        saveData: connection && typeof connection.saveData === "boolean"
          ? connection.saveData
          : "Unknown"
      };
    },

    normalizeData(data) {
      data = data && typeof data === "object" ? data : {};

      const keys = ["browser", "device", "platform", "screen", "network"];
      const normalized = {};

      keys.forEach((key) => {
        const section = data[key];

        normalized[key] =
          section && typeof section === "object"
            ? section
            : {};
      });

      return normalized;
    },

    renderValues() {
      if (!this.root) return;

      const data = this.state.data || {};

      Object.keys(this.state.sections).forEach((sectionName) => {
        const container = this.root.querySelector(
          '[data-system-info-values="' + sectionName + '"]'
        );

        if (!container) return;

        const sectionData = data[sectionName] || {};
        const entries = Object.entries(sectionData);

        if (!entries.length) {
          container.innerHTML = `
            <div class="system-info-empty">No information available</div>
          `;
          return;
        }

        container.replaceChildren();

        entries.forEach(([key, value]) => {
          const term = document.createElement("dt");
          const description = document.createElement("dd");
          const row = document.createElement("div");

          row.className = "system-info-value-row";
          term.textContent = this.formatLabel(key);
          description.textContent = this.formatValue(value);

          row.append(term, description);
          container.appendChild(row);
        });
      });

      this.updateNetworkStatus();
    },

    formatLabel(value) {
      return String(value)
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/^./, (character) => character.toUpperCase());
    },

    formatValue(value) {
      if (value === null || value === undefined || value === "") {
        return "Unavailable";
      }

      if (typeof value === "boolean") {
        return value ? "Yes" : "No";
      }

      if (Array.isArray(value)) {
        return value.map((item) => this.safeText(item)).join(", ");
      }

      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch (_) {
          return "Unavailable";
        }
      }

      return this.safeText(value);
    },

    toggleSection(name) {
      if (!Object.prototype.hasOwnProperty.call(this.state.sections, name)) {
        return;
      }

      this.state.sections[name] = !this.state.sections[name];

      const section = this.root.querySelector(
        '[data-info-section="' + name + '"]'
      );

      const button = this.root.querySelector(
        '[data-system-info-toggle="' + name + '"]'
      );

      const values = this.root.querySelector(
        '[data-system-info-values="' + name + '"]'
      );

      if (!section || !button || !values) return;

      const expanded = this.state.sections[name];

      button.setAttribute("aria-expanded", expanded ? "true" : "false");
      section.classList.toggle("is-collapsed", !expanded);
      values.hidden = !expanded;
    },

    updateNetworkStatus() {
      if (!this.root) return;

      const status = this.root.querySelector(
        '[data-system-info-values="network"]'
      );

      if (!status) return;

      const online = global.navigator
        ? global.navigator.onLine !== false
        : true;

      this.root.classList.toggle("is-online", online);
      this.root.classList.toggle("is-offline", !online);
    },

    updateStatus(message) {
      if (!this.root) return;

      const status = this.root.querySelector("[data-system-info-status]");

      if (status) {
        status.textContent = message;
      }
    },

    renderError() {
      if (!this.root) return;

      const container = this.root.querySelector("[data-system-info-error]");

      if (!container) return;

      container.hidden = !this.state.error;
      container.textContent = this.state.error || "";
    },

    renderUpdatedAt() {
      if (!this.root || !this.state.lastUpdated) return;

      const container = this.root.querySelector("[data-system-info-updated]");

      if (!container) return;

      container.textContent =
        "Last updated: " +
        this.state.lastUpdated.toLocaleTimeString();
    },

    updateRefreshButton() {
      if (!this.root) return;

      const button = this.root.querySelector(
        '[data-system-info-action="refresh"]'
      );

      if (!button) return;

      button.disabled = this.state.loading;
      button.setAttribute(
        "aria-busy",
        this.state.loading ? "true" : "false"
      );
    },

    startAutoRefresh(interval) {
      this.stopAutoRefresh();

      const value = Number(interval);

      this.refreshInterval = Number.isFinite(value)
        ? Math.max(10000, Math.min(3600000, value))
        : 60000;

      this.refreshTimer = global.setInterval(() => {
        if (this.visible && !this.state.loading) {
          this.refresh();
        }
      }, this.refreshInterval);
    },

    stopAutoRefresh() {
      if (this.refreshTimer !== null) {
        global.clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    },

    openPrivacySettings() {
      if (
        this.privacyConsent &&
        typeof this.privacyConsent.openSettings === "function"
      ) {
        this.privacyConsent.openSettings();
        return;
      }

      if (
        this.privacyConsent &&
        typeof this.privacyConsent.show === "function"
      ) {
        this.privacyConsent.show();
        return;
      }

      this.emit("system-info:privacy-settings-request");
    },

    getTimezone() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Unavailable";
      } catch (_) {
        return "Unavailable";
      }
    },

    getTimezoneOffset() {
      try {
        return "UTC" + this.formatOffset(new Date().getTimezoneOffset());
      } catch (_) {
        return "Unavailable";
      }
    },

    formatOffset(offset) {
      const minutes = -offset;
      const sign = minutes >= 0 ? "+" : "-";
      const absolute = Math.abs(minutes);
      const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
      const remainder = String(absolute % 60).padStart(2, "0");

      return sign + hours + ":" + remainder;
    },

    getColorScheme() {
      if (global.matchMedia) {
        if (global.matchMedia("(prefers-color-scheme: dark)").matches) {
          return "Dark";
        }

        if (global.matchMedia("(prefers-color-scheme: light)").matches) {
          return "Light";
        }
      }

      return "Unknown";
    },

    getReducedMotion() {
      if (!global.matchMedia) return "Unknown";

      return global.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "Enabled"
        : "Disabled";
    },

    bindExternalEvent(name, handler) {
      global.addEventListener(name, handler);

      this.subscriptions.push({
        name,
        handler
      });
    },

    emit(name, detail) {
      const payload = Object.assign(
        {
          visible: this.visible,
          timestamp: Date.now()
        },
        detail || {}
      );

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit(name, payload);
      }

      if (typeof global.CustomEvent === "function") {
        global.dispatchEvent(
          new CustomEvent(name, {
            detail: payload
          })
        );
      }
    },

    safeText(value) {
      return String(value ?? "").slice(0, 1000);
    },

    isVisible() {
      return this.visible;
    },

    getData() {
      return this.state.data;
    },

    getState() {
      return {
        loading: this.state.loading,
        error: this.state.error,
        lastUpdated: this.state.lastUpdated,
        visible: this.visible
      };
    },

    destroy() {
      this.stopAutoRefresh();

      if (this.root && this.handlers.click) {
        this.root.removeEventListener("click", this.handlers.click);
      }

      if (this.handlers.online) {
        global.removeEventListener("online", this.handlers.online);
      }

      if (this.handlers.offline) {
        global.removeEventListener("offline", this.handlers.offline);
      }

      this.subscriptions.forEach((subscription) => {
        global.removeEventListener(
          subscription.name,
          subscription.handler
        );
      });

      this.subscriptions = [];
      this.handlers = {};
      this.root = null;
      this.controller = null;
      this.view = null;
      this.privacyConsent = null;
      this.initialized = false;
      this.visible = false;
    }
  };

  global.SnakeSystemInfoPanel = SnakeSystemInfoPanel;
})(window);