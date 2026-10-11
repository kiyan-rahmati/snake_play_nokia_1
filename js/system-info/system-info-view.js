(function (global) {
  "use strict";

  class SnakeSystemInfoView {
    constructor(options) {
      const settings = options || {};

      this.root =
        typeof settings.root === "string"
          ? document.querySelector(settings.root)
          : settings.root || null;

      this.controller = settings.controller || null;
      this.consent = settings.consent || null;
      this.publicIPProvider = settings.publicIPProvider || null;

      this.onPublicIPRequested =
        typeof settings.onPublicIPRequested === "function"
          ? settings.onPublicIPRequested
          : null;

      this.unsubscribeConsent = null;
      this.destroyed = false;

      this.handleClick = this.handleClick.bind(this);
      this.handleConsentChange = this.handleConsentChange.bind(this);

      if (this.root) {
        this.root.addEventListener("click", this.handleClick);
      }

      if (this.consent && typeof this.consent.subscribe === "function") {
        this.unsubscribeConsent = this.consent.subscribe(
          this.handleConsentChange
        );
      }
    }

    render(info) {
      this._assertAlive();

      if (!this.root) {
        return false;
      }

      const data = info && typeof info === "object" ? info : {};

      this.root.replaceChildren();

      const container = document.createElement("section");
      container.className = "system-info";
      container.setAttribute("aria-labelledby", "system-info-title");

      const heading = document.createElement("h2");
      heading.id = "system-info-title";
      heading.className = "system-info__title";
      heading.textContent = "System Information";

      const description = document.createElement("p");
      description.className = "system-info__description";
      description.textContent =
        "Information about your current browser and device.";

      const list = document.createElement("dl");
      list.className = "system-info__list";

      const fields = [
        ["Browser", data.browser],
        ["Operating system", data.platform],
        ["Device", data.device],
        ["Screen resolution", data.screenResolution],
        ["Viewport", data.viewport],
        ["Language", data.language],
        ["Timezone", data.timezone]
      ];

      for (const [label, value] of fields) {
        if (value === undefined || value === null || value === "") {
          continue;
        }

        this._appendDefinition(list, label, String(value));
      }

      container.append(heading, description, list);

      const consentGranted =
        this.consent &&
        typeof this.consent.hasConsent === "function" &&
        this.consent.hasConsent("publicIP");

      const ipSection = this._createIPSection(consentGranted);

      container.appendChild(ipSection);
      this.root.appendChild(container);

      return true;
    }

    _appendDefinition(list, label, value) {
      const term = document.createElement("dt");
      term.className = "system-info__label";
      term.textContent = label;

      const description = document.createElement("dd");
      description.className = "system-info__value";
      description.textContent = value;

      list.append(term, description);
    }

    _createIPSection(consentGranted) {
      const section = document.createElement("section");
      section.className = "system-info__ip";
      section.setAttribute("aria-labelledby", "system-info-ip-title");

      const heading = document.createElement("h3");
      heading.id = "system-info-ip-title";
      heading.textContent = "Public IP Address";

      const explanation = document.createElement("p");
      explanation.textContent =
        "Your public IP address is not requested unless you explicitly allow it.";

      const status = document.createElement("p");
      status.className = "system-info__ip-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "system-info__ip-button";
      button.dataset.action = "request-public-ip";

      if (consentGranted) {
        button.textContent = "Check public IP";
        status.textContent = "Permission has been granted.";
      } else {
        button.textContent = "Allow and check public IP";
        status.textContent = "Permission is required.";
      }

      section.append(heading, explanation, status, button);

      return section;
    }

    async handleClick(event) {
      const button = event.target.closest(
        '[data-action="request-public-ip"]'
      );

      if (!button || !this.root || !this.root.contains(button)) {
        return;
      }

      event.preventDefault();

      if (button.disabled) {
        return;
      }

      const section = button.closest(".system-info__ip");
      const status = section
        ? section.querySelector(".system-info__ip-status")
        : null;

      button.disabled = true;

      try {
        const granted =
          this.consent &&
          typeof this.consent.hasConsent === "function" &&
          this.consent.hasConsent("publicIP");

        if (!granted) {
          if (
            !this.consent ||
            typeof this.consent.setConsent !== "function"
          ) {
            if (status) {
              status.textContent =
                "Privacy consent is unavailable. No request was made.";
            }

            return;
          }

          this.consent.setConsent("publicIP", true);
        }

        if (this.onPublicIPRequested) {
          const result = await this.onPublicIPRequested();

          this._displayIPResult(status, result);
          return;
        }

        if (
          !this.publicIPProvider ||
          typeof this.publicIPProvider.getPublicIP !== "function"
        ) {
          if (status) {
            status.textContent =
              "Public IP lookup is currently unavailable.";
          }

          return;
        }

        if (status) {
          status.textContent = "Checking public IP…";
        }

        const result = await this.publicIPProvider.getPublicIP();

        this._displayIPResult(status, result);
      } catch (error) {
        if (status) {
          status.textContent =
            "Unable to check the public IP address.";
        }
      } finally {
        if (button.isConnected) {
          button.disabled = false;
        }
      }
    }

    _displayIPResult(status, result) {
      if (!status) {
        return;
      }

      if (!result || result.success !== true || !result.ip) {
        status.textContent =
          "Unable to retrieve the public IP address.";
        return;
      }

      status.textContent = "Public IP: " + String(result.ip);
    }

    handleConsentChange(event) {
      if (
        !event ||
        !event.consents ||
        typeof event.consents.publicIP !== "boolean"
      ) {
        return;
      }

      const section = this.root
        ? this.root.querySelector(".system-info__ip")
        : null;

      if (!section) {
        return;
      }

      const button = section.querySelector(
        '[data-action="request-public-ip"]'
      );

      const status = section.querySelector(".system-info__ip-status");

      if (button) {
        button.textContent = event.consents.publicIP
          ? "Check public IP"
          : "Allow and check public IP";
      }

      if (status) {
        status.textContent = event.consents.publicIP
          ? "Permission has been granted."
          : "Permission is required.";
      }
    }

    async refresh() {
      this._assertAlive();

      if (
        !this.controller ||
        typeof this.controller.getSystemInfo !== "function"
      ) {
        return false;
      }

      const info = await this.controller.getSystemInfo();

      return this.render(info);
    }

    clear() {
      this._assertAlive();

      if (this.root) {
        this.root.replaceChildren();
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeSystemInfoView has been destroyed.");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.root) {
        this.root.removeEventListener("click", this.handleClick);
      }

      if (typeof this.unsubscribeConsent === "function") {
        this.unsubscribeConsent();
      }

      this.unsubscribeConsent = null;
      this.root = null;
      this.controller = null;
      this.consent = null;
      this.publicIPProvider = null;
      this.onPublicIPRequested = null;
      this.destroyed = true;
    }
  }

  global.SnakeSystemInfoView = SnakeSystemInfoView;
})(window);