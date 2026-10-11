(function (global) {
  "use strict";

  const SnakePublicIPDialog = {
    root: null,
    trigger: null,
    provider: null,
    consent: null,
    initialized: false,
    loading: false,
    requestController: null,
    requestTimeout: null,
    state: {
      visible: false,
      ip: null,
      error: null,
      consentGranted: false
    },

    init(options) {
      options = options || {};

      if (this.initialized) return this;

      this.provider =
        options.provider ||
        global.SnakePublicIPProvider ||
        null;

      this.consent =
        options.consent ||
        global.SnakePrivacyConsent ||
        null;

      this.trigger =
        options.trigger ||
        document.querySelector("[data-public-ip-open]");

      this.root =
        options.root ||
        document.querySelector("[data-public-ip-dialog]");

      if (!this.root) {
        this.root = document.createElement("dialog");
        this.root.dataset.publicIpDialog = "";
        this.root.className = "public-ip-dialog";

        document.body.appendChild(this.root);
      }

      if (this.root.tagName.toLowerCase() !== "dialog") {
        this.root.setAttribute("role", "dialog");
        this.root.setAttribute("aria-modal", "true");
      }

      this.render();
      this.bindEvents();
      this.initialized = true;

      return this;
    },

    render() {
      this.root.innerHTML = `
        <div class="public-ip-dialog-inner">
          <header class="public-ip-dialog-header">
            <div>
              <p class="public-ip-eyebrow">NETWORK INFORMATION</p>
              <h2 id="public-ip-dialog-title">Public IP Address</h2>
            </div>

            <button
              type="button"
              data-public-ip-action="close"
              aria-label="Close dialog"
            >×</button>
          </header>

          <p id="public-ip-dialog-description">
            Your public IP address can be requested from an external service.
            This sends a network request to that service.
          </p>

          <div
            class="public-ip-consent"
            data-public-ip-consent
          >
            <label class="public-ip-consent-label">
              <input type="checkbox" data-public-ip-consent-checkbox>
              <span>
                I agree to contact an external IP lookup service to retrieve
                my public IP address.
              </span>
            </label>
          </div>

          <div
            class="public-ip-result"
            data-public-ip-result
            aria-live="polite"
            aria-atomic="true"
          >
            <span class="public-ip-result-label">Your public IP</span>
            <output data-public-ip-value>Not requested</output>
          </div>

          <p
            class="public-ip-error"
            data-public-ip-error
            role="alert"
            hidden
          ></p>

          <footer class="public-ip-dialog-actions">
            <button
              type="button"
              data-public-ip-action="cancel"
            >Cancel</button>

            <button
              type="button"
              data-public-ip-action="lookup"
              disabled
            >Look up IP</button>

            <button
              type="button"
              data-public-ip-action="copy"
              disabled
            >Copy IP</button>
          </footer>
        </div>
      `;

      this.updateUI();
    },

    bindEvents() {
      if (this.handleClick) return;

      this.handleClick = (event) => {
        const action = event.target.closest("[data-public-ip-action]");

        if (action && this.root.contains(action)) {
          this.handleAction(action.dataset.publicIpAction);
          return;
        }

        if (event.target.matches("[data-public-ip-consent-checkbox]")) {
          this.state.consentGranted = event.target.checked;
          this.updateUI();
        }
      };

      this.handleTriggerClick = () => {
        this.open();
      };

      this.handleBackdropClick = (event) => {
        if (
          this.root.tagName.toLowerCase() === "dialog" &&
          event.target === this.root
        ) {
          this.close();
        }
      };

      this.handleKeydown = (event) => {
        if (event.key === "Escape" && this.state.visible) {
          this.close();
        }
      };

      this.root.addEventListener("click", this.handleClick);
      this.root.addEventListener("click", this.handleBackdropClick);
      document.addEventListener("keydown", this.handleKeydown);

      if (this.trigger) {
        this.trigger.addEventListener("click", this.handleTriggerClick);
      }
    },

    handleAction(action) {
      switch (action) {
        case "close":
        case "cancel":
          this.close();
          break;

        case "lookup":
          this.lookup();
          break;

        case "copy":
          this.copyIP();
          break;

        default:
          break;
      }
    },

    open() {
      if (!this.initialized) {
        this.init();
      }

      this.state.visible = true;
      this.state.error = null;

      if (this.root.tagName.toLowerCase() === "dialog") {
        if (!this.root.open) {
          this.root.showModal();
        }
      } else {
        this.root.hidden = false;
        this.root.classList.add("is-visible");
      }

      this.root.setAttribute("aria-labelledby", "public-ip-dialog-title");
      this.root.setAttribute(
        "aria-describedby",
        "public-ip-dialog-description"
      );

      this.updateUI();

      const checkbox = this.root.querySelector(
        "[data-public-ip-consent-checkbox]"
      );

      if (checkbox) checkbox.focus();

      this.emit("public-ip-dialog:opened");

      return this;
    },

    close() {
      if (!this.root || !this.state.visible) return;

      this.state.visible = false;

      if (this.root.tagName.toLowerCase() === "dialog") {
        if (this.root.open) {
          this.root.close();
        }
      } else {
        this.root.hidden = true;
        this.root.classList.remove("is-visible");
      }

      this.emit("public-ip-dialog:closed");
    },

    async lookup() {
      if (this.loading) return null;

      if (!this.state.consentGranted) {
        this.setError("Please give consent before requesting your public IP.");
        return null;
      }

      this.loading = true;
      this.state.error = null;
      this.updateUI();

      this.requestController =
        typeof AbortController === "function"
          ? new AbortController()
          : null;

      try {
        const result = await this.requestPublicIP();

        const ip = this.extractIP(result);

        if (!this.isValidIP(ip)) {
          throw new Error("The IP lookup service returned an invalid address.");
        }

        this.state.ip = ip;
        this.state.error = null;

        this.emit("public-ip-dialog:success", {
          ip
        });

        return ip;
      } catch (error) {
        if (error && error.name === "AbortError") {
          this.setError("The IP lookup request was cancelled.");
        } else {
          this.setError(
            error && error.message
              ? error.message
              : "Unable to retrieve your public IP address."
          );
        }

        this.emit("public-ip-dialog:error", {
          message: this.state.error
        });

        return null;
      } finally {
        this.loading = false;
        this.clearRequestTimeout();
        this.requestController = null;
        this.updateUI();
      }
    },

    async requestPublicIP() {
      if (
        this.provider &&
        typeof this.provider.getPublicIP === "function"
      ) {
        return this.provider.getPublicIP({
          signal: this.requestController
            ? this.requestController.signal
            : undefined
        });
      }

      if (
        this.provider &&
        typeof this.provider.getIP === "function"
      ) {
        return this.provider.getIP();
      }

      if (typeof global.fetch !== "function") {
        throw new Error("This browser does not support network requests.");
      }

      const endpoint = "https://api.ipify.org?format=json";

      const timeoutPromise = new Promise((_, reject) => {
        this.requestTimeout = global.setTimeout(() => {
          if (this.requestController) {
            this.requestController.abort();
          }

          reject(new Error("The IP lookup request timed out."));
        }, 10000);
      });

      const fetchPromise = global.fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store",
        signal: this.requestController
          ? this.requestController.signal
          : undefined
      }).then((response) => {
        if (!response.ok) {
          throw new Error("The IP lookup service returned an error.");
        }

        return response.json();
      });

      return Promise.race([fetchPromise, timeoutPromise]);
    },

    extractIP(result) {
      if (typeof result === "string") {
        return result.trim();
      }

      if (!result || typeof result !== "object") {
        return "";
      }

      const candidates = [
        result.ip,
        result.address,
        result.publicIP,
        result.publicIp,
        result.data && result.data.ip
      ];

      return String(
        candidates.find((value) => typeof value === "string" && value.trim()) ||
        ""
      ).trim();
    },

    isValidIP(value) {
      if (typeof value !== "string") return false;

      const ip = value.trim();

      if (ip.length > 45) return false;

      const ipv4Parts = ip.split(".");

      if (
        ipv4Parts.length === 4 &&
        ipv4Parts.every((part) => /^\d{1,3}$/.test(part))
      ) {
        return ipv4Parts.every((part) => {
          const number = Number(part);
          return number >= 0 && number <= 255;
        });
      }

      if (!ip.includes(":")) return false;

      if (!/^[0-9a-fA-F:.]+$/.test(ip)) return false;

      const normalized = ip.split("::");

      if (normalized.length > 2) return false;

      const groups = ip
        .replace(/::/g, ":")
        .split(":")
        .filter(Boolean);

      if (groups.some((group) => group.length > 4)) return false;

      if (normalized.length === 1) {
        return groups.length === 8;
      }

      return groups.length < 8;
    },

    async copyIP() {
      if (!this.state.ip) {
        this.setError("There is no IP address to copy.");
        return false;
      }

      try {
        if (
          global.navigator &&
          global.navigator.clipboard &&
          typeof global.navigator.clipboard.writeText === "function"
        ) {
          await global.navigator.clipboard.writeText(this.state.ip);
        } else {
          this.copyUsingFallback(this.state.ip);
        }

        this.emit("public-ip-dialog:copied", {
          ip: this.state.ip
        });

        return true;
      } catch (_) {
        this.setError("Unable to copy the IP address.");
        return false;
      }
    },

    copyUsingFallback(value) {
      const textarea = document.createElement("textarea");

      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";

      document.body.appendChild(textarea);
      textarea.select();

      const copied = document.execCommand("copy");

      textarea.remove();

      if (!copied) {
        throw new Error("Clipboard copy failed.");
      }
    },

    setError(message) {
      this.state.error = String(message || "An unexpected error occurred.");
      this.updateUI();
    },

    updateUI() {
      if (!this.root) return;

      const checkbox = this.root.querySelector(
        "[data-public-ip-consent-checkbox]"
      );

      const lookupButton = this.root.querySelector(
        '[data-public-ip-action="lookup"]'
      );

      const copyButton = this.root.querySelector(
        '[data-public-ip-action="copy"]'
      );

      const output = this.root.querySelector("[data-public-ip-value]");
      const error = this.root.querySelector("[data-public-ip-error]");
      const consentContainer = this.root.querySelector(
        "[data-public-ip-consent]"
      );

      if (checkbox) {
        checkbox.checked = this.state.consentGranted;
        checkbox.disabled = this.loading;
      }

      if (lookupButton) {
        lookupButton.disabled =
          this.loading || !this.state.consentGranted;

        lookupButton.textContent = this.loading
          ? "Looking up…"
          : "Look up IP";

        lookupButton.setAttribute(
          "aria-busy",
          this.loading ? "true" : "false"
        );
      }

      if (copyButton) {
        copyButton.disabled = !this.state.ip || this.loading;
      }

      if (output) {
        output.textContent =
          this.state.ip ||
          (this.loading ? "Requesting…" : "Not requested");
      }

      if (error) {
        error.hidden = !this.state.error;
        error.textContent = this.state.error || "";
      }

      if (consentContainer) {
        consentContainer.classList.toggle(
          "is-consented",
          this.state.consentGranted
        );
      }

      this.root.classList.toggle("is-loading", this.loading);
      this.root.classList.toggle("has-error", Boolean(this.state.error));
      this.root.classList.toggle("has-result", Boolean(this.state.ip));
    },

    clearRequestTimeout() {
      if (this.requestTimeout !== null) {
        global.clearTimeout(this.requestTimeout);
        this.requestTimeout = null;
      }
    },

    emit(name, detail) {
      const payload = Object.assign(
        {
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

    destroy() {
      if (this.requestController) {
        this.requestController.abort();
      }

      this.clearRequestTimeout();

      if (this.root && this.handleClick) {
        this.root.removeEventListener("click", this.handleClick);
        this.root.removeEventListener("click", this.handleBackdropClick);
      }

      if (this.trigger && this.handleTriggerClick) {
        this.trigger.removeEventListener(
          "click",
          this.handleTriggerClick
        );
      }

      if (this.handleKeydown) {
        document.removeEventListener("keydown", this.handleKeydown);
      }

      this.root = null;
      this.trigger = null;
      this.provider = null;
      this.consent = null;
      this.handleClick = null;
      this.handleTriggerClick = null;
      this.handleBackdropClick = null;
      this.handleKeydown = null;
      this.initialized = false;
      this.loading = false;

      this.state = {
        visible: false,
        ip: null,
        error: null,
        consentGranted: false
      };
    }
  };

  global.SnakePublicIPDialog = SnakePublicIPDialog;
})(window);