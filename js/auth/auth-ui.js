(function (global) {
  "use strict";

  class AuthUI {
    constructor(options) {
      const settings = options || {};

      this.controller = settings.controller || null;
      this.guestSession = settings.guestSession || null;
      this.demoSession = settings.demoSession || null;
      this.root = settings.root || null;

      this.selectors = {
        form: "[data-auth-form]",
        username: "[data-auth-username]",
        submit: "[data-auth-submit]",
        guest: "[data-auth-guest]",
        demo: "[data-auth-demo]",
        logout: "[data-auth-logout]",
        error: "[data-auth-error]",
        status: "[data-auth-status]",
        panel: "[data-auth-panel]",
        session: "[data-auth-session]",
        ...(settings.selectors || {})
      };

      this.unsubscribe = [];
      this.bound = false;
      this.busy = false;
      this.destroyed = false;
    }

    initialize() {
      if (this.destroyed) {
        throw new Error("AuthUI has been destroyed.");
      }

      if (this.bound) {
        return this;
      }

      this.root = this.root || document;

      this._bindEvents();
      this._subscribeToSessions();
      this.refresh();

      this.bound = true;

      return this;
    }

    _bindEvents() {
      this._listen("submit", this.selectors.form, (event) => {
        event.preventDefault();
        this._handleLogin();
      });

      this._listen("click", this.selectors.guest, () => {
        this._handleGuest();
      });

      this._listen("click", this.selectors.demo, () => {
        this._handleDemo();
      });

      this._listen("click", this.selectors.logout, () => {
        this._handleLogout();
      });
    }

    _listen(eventName, selector, callback) {
      this.root.addEventListener(eventName, (event) => {
        const target = event.target.closest(selector);

        if (!target || !this.root.contains(target)) {
          return;
        }

        callback(event, target);
      });
    }

    _subscribeToSessions() {
      const sources = [
        this.controller,
        this.guestSession,
        this.demoSession
      ];

      for (const source of sources) {
        if (source && typeof source.subscribe === "function") {
          const unsubscribe = source.subscribe(() => {
            this.refresh();
          });

          if (typeof unsubscribe === "function") {
            this.unsubscribe.push(unsubscribe);
          }
        }
      }
    }

    async _handleLogin() {
      if (this.busy) {
        return;
      }

      const form = this.root.querySelector(this.selectors.form);
      const usernameInput = form
        ? form.querySelector(this.selectors.username)
        : null;

      if (!usernameInput) {
        this._showError("Username field is unavailable.");
        return;
      }

      const username = usernameInput.value.trim();

      if (!username) {
        this._showError("Enter a username to continue.");
        usernameInput.focus();
        return;
      }

      await this._run(async () => {
        if (
          !this.controller ||
          typeof this.controller.login !== "function"
        ) {
          throw new Error("Authentication is unavailable.");
        }

        await this.controller.login({ username });
        this._showStatus("Signed in successfully.");
        this.refresh();
      });
    }

    async _handleGuest() {
      if (this.busy) {
        return;
      }

      const input = this.root.querySelector(this.selectors.username);
      const username = input ? input.value.trim() : "";

      await this._run(async () => {
        if (!this.guestSession) {
          throw new Error("Guest sessions are unavailable.");
        }

        if (typeof this.guestSession.initialize === "function") {
          this.guestSession.initialize();
        }

        if (typeof this.guestSession.start !== "function") {
          throw new Error("Guest session could not be started.");
        }

        this.guestSession.start(username);
        this._showStatus("Guest session started.");
        this.refresh();
      });
    }

    async _handleDemo() {
      if (this.busy) {
        return;
      }

      await this._run(async () => {
        if (!this.demoSession) {
          throw new Error("Demo sessions are unavailable.");
        }

        if (typeof this.demoSession.initialize === "function") {
          this.demoSession.initialize();
        }

        if (typeof this.demoSession.start === "function") {
          this.demoSession.start();
        } else if (typeof this.demoSession.begin === "function") {
          this.demoSession.begin();
        } else {
          throw new Error("Demo session could not be started.");
        }

        this._showStatus("Demo session started.");
        this.refresh();
      });
    }

    async _handleLogout() {
      if (this.busy) {
        return;
      }

      await this._run(async () => {
        if (this.controller && typeof this.controller.logout === "function") {
          await this.controller.logout();
        }

        if (
          this.guestSession &&
          typeof this.guestSession.isActive === "function" &&
          this.guestSession.isActive()
        ) {
          this.guestSession.end();
        }

        if (
          this.demoSession &&
          typeof this.demoSession.end === "function"
        ) {
          this.demoSession.end();
        }

        this._showStatus("Session ended.");
        this.refresh();
      });
    }

    async _run(operation) {
      this.busy = true;
      this._setBusy(true);
      this._clearError();

      try {
        await operation();
      } catch (error) {
        this._showError(
          error && error.message
            ? error.message
            : "Something went wrong. Please try again."
        );
      } finally {
        this.busy = false;
        this._setBusy(false);
      }
    }

    refresh() {
      if (!this.root) {
        return;
      }

      const session = this._getActiveSession();
      const panels = this.root.querySelectorAll(this.selectors.panel);
      const sessionElements = this.root.querySelectorAll(
        this.selectors.session
      );

      for (const panel of panels) {
        panel.hidden = Boolean(session);
      }

      for (const element of sessionElements) {
        element.hidden = !session;
      }

      if (session) {
        this._showStatus(
          "Signed in as " + this._safeUsername(session)
        );
      }
    }

    _getActiveSession() {
      const sources = [
        this.controller,
        this.guestSession,
        this.demoSession
      ];

      for (const source of sources) {
        if (!source) {
          continue;
        }

        if (
          typeof source.getSession === "function" &&
          typeof source.isActive === "function" &&
          source.isActive()
        ) {
          return source.getSession();
        }

        if (
          typeof source.getSession === "function" &&
          !("isActive" in source)
        ) {
          const session = source.getSession();

          if (session) {
            return session;
          }
        }
      }

      return null;
    }

    _safeUsername(session) {
      if (!session || typeof session !== "object") {
        return "player";
      }

      const username =
        session.username ||
        (session.user && session.user.username);

      return typeof username === "string" && username.trim()
        ? username.trim()
        : "player";
    }

    _showError(message) {
      const elements = this.root.querySelectorAll(this.selectors.error);

      for (const element of elements) {
        element.textContent = message;
        element.hidden = false;
        element.setAttribute("role", "alert");
      }
    }

    _clearError() {
      const elements = this.root.querySelectorAll(this.selectors.error);

      for (const element of elements) {
        element.textContent = "";
        element.hidden = true;
      }
    }

    _showStatus(message) {
      const elements = this.root.querySelectorAll(this.selectors.status);

      for (const element of elements) {
        element.textContent = message;
        element.hidden = false;
        element.setAttribute("role", "status");
      }
    }

    _setBusy(busy) {
      const buttons = this.root.querySelectorAll(
        [
          this.selectors.submit,
          this.selectors.guest,
          this.selectors.demo,
          this.selectors.logout
        ].join(",")
      );

      for (const button of buttons) {
        button.disabled = busy;
        button.setAttribute("aria-busy", String(busy));
      }
    }

    destroy() {
      for (const unsubscribe of this.unsubscribe) {
        try {
          unsubscribe();
        } catch (_) {
          // Ignore unsubscribe failures during cleanup.
        }
      }

      this.unsubscribe = [];
      this.bound = false;
      this.destroyed = true;
      this.root = null;
    }
  }

  global.SnakeAuthUI = AuthUI;
})(window);