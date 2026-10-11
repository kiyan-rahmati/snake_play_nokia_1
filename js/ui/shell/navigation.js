(function (global) {
  "use strict";

  class SnakeNavigation {
    constructor(options) {
      const settings = options || {};

      this.root =
        settings.root ||
        document.querySelector("[data-app-navigation]");

      this.currentPage = settings.currentPage || "home";
      this.language = settings.language || "en";
      this.isOpen = false;
      this.destroyed = false;
      this.listeners = new Map();
      this.boundClick = this.handleClick.bind(this);
      this.boundKeydown = this.handleKeydown.bind(this);
      this.boundDocumentClick = this.handleDocumentClick.bind(this);

      this.pages = Array.isArray(settings.pages)
        ? settings.pages.slice()
        : [
            { id: "home", label: "Home", icon: "⌂" },
            { id: "game", label: "Play", icon: "▶" },
            { id: "profile", label: "Profile", icon: "♙" },
            { id: "achievements", label: "Achievements", icon: "★" },
            { id: "settings", label: "Settings", icon: "⚙" }
          ];

      if (this.root) {
        this.mount();
      }
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeNavigation has been destroyed.");
      }
    }

    mount() {
      this.assertAlive();

      if (!this.root) {
        return false;
      }

      this.root.classList.add("snake-navigation");
      this.root.setAttribute("role", "navigation");
      this.root.setAttribute(
        "aria-label",
        this.language === "fa" ? "ناوبری اصلی" : "Main navigation"
      );

      this.render();

      this.root.addEventListener("click", this.boundClick);
      this.root.addEventListener("keydown", this.boundKeydown);

      if (typeof document !== "undefined") {
        document.addEventListener(
          "click",
          this.boundDocumentClick
        );
      }

      this.emit("mounted", {
        currentPage: this.currentPage
      });

      return true;
    }

    render() {
      this.assertAlive();

      if (!this.root) {
        return false;
      }

      const fragment = document.createDocumentFragment();

      this.pages.forEach((page) => {
        if (
          !page ||
          typeof page.id !== "string" ||
          typeof page.label !== "string"
        ) {
          return;
        }

        const button = document.createElement("button");

        button.type = "button";
        button.className = "snake-navigation__item";
        button.dataset.page = page.id;
        button.setAttribute(
          "aria-current",
          page.id === this.currentPage ? "page" : "false"
        );

        if (page.disabled) {
          button.disabled = true;
        }

        const icon = document.createElement("span");
        icon.className = "snake-navigation__icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = page.icon || "";

        const label = document.createElement("span");
        label.className = "snake-navigation__label";
        label.textContent = page.label;

        button.append(icon, label);
        fragment.appendChild(button);
      });

      this.root.replaceChildren(fragment);
      this.root.dataset.open = String(this.isOpen);
      this.root.dataset.language = this.language;

      return true;
    }

    setPages(pages) {
      this.assertAlive();

      if (!Array.isArray(pages)) {
        return false;
      }

      const validPages = pages.filter((page) => {
        return (
          page &&
          typeof page.id === "string" &&
          typeof page.label === "string"
        );
      });

      const ids = new Set();

      for (const page of validPages) {
        if (ids.has(page.id)) {
          return false;
        }

        ids.add(page.id);
      }

      this.pages = validPages.slice();

      if (!ids.has(this.currentPage)) {
        this.currentPage = this.pages.length
          ? this.pages[0].id
          : "";
      }

      this.render();

      this.emit("pages-updated", {
        pages: this.pages.slice(),
        currentPage: this.currentPage
      });

      return true;
    }

    navigate(pageId, options) {
      this.assertAlive();

      if (typeof pageId !== "string") {
        return false;
      }

      const page = this.pages.find((item) => {
        return item.id === pageId && !item.disabled;
      });

      if (!page) {
        return false;
      }

      const previousPage = this.currentPage;

      this.currentPage = pageId;
      this.close();

      this.render();

      this.emit("navigate", {
        page: pageId,
        previousPage: previousPage,
        source: options && options.source
          ? options.source
          : "api"
      });

      return true;
    }

    setCurrentPage(pageId) {
      return this.navigate(pageId, {
        source: "api"
      });
    }

    getCurrentPage() {
      this.assertAlive();
      return this.currentPage;
    }

    setLanguage(language) {
      this.assertAlive();

      if (language !== "en" && language !== "fa") {
        return false;
      }

      this.language = language;

      if (this.root) {
        this.root.setAttribute(
          "aria-label",
          language === "fa" ? "ناوبری اصلی" : "Main navigation"
        );

        this.root.dir = language === "fa" ? "rtl" : "ltr";
      }

      this.render();

      this.emit("language-changed", {
        language: this.language
      });

      return true;
    }

    open() {
      this.assertAlive();

      if (!this.root) {
        return false;
      }

      this.isOpen = true;
      this.root.dataset.open = "true";
      this.root.classList.add("is-open");

      this.emit("open", {
        currentPage: this.currentPage
      });

      return true;
    }

    close() {
      this.assertAlive();

      if (!this.root) {
        return false;
      }

      const wasOpen = this.isOpen;

      this.isOpen = false;
      this.root.dataset.open = "false";
      this.root.classList.remove("is-open");

      if (wasOpen) {
        this.emit("close", {
          currentPage: this.currentPage
        });
      }

      return true;
    }

    toggle() {
      this.assertAlive();

      return this.isOpen
        ? this.close()
        : this.open();
    }

    handleClick(event) {
      if (this.destroyed) {
        return;
      }

      const button = event.target.closest("[data-page]");

      if (!button || !this.root.contains(button)) {
        return;
      }

      if (button.disabled) {
        return;
      }

      this.navigate(button.dataset.page, {
        source: "user"
      });
    }

    handleKeydown(event) {
      if (this.destroyed || !this.root) {
        return;
      }

      if (event.key === "Escape" && this.isOpen) {
        this.close();
        return;
      }

      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }

      const items = Array.from(
        this.root.querySelectorAll(
          "button[data-page]:not(:disabled)"
        )
      );

      if (!items.length) {
        return;
      }

      const currentIndex = items.indexOf(document.activeElement);
      let nextIndex = currentIndex;

      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = items.length - 1;
      } else if (event.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % items.length;
      } else if (event.key === "ArrowUp") {
        nextIndex =
          (currentIndex - 1 + items.length) % items.length;
      }

      event.preventDefault();
      items[nextIndex].focus();
    }

    handleDocumentClick(event) {
      if (
        this.destroyed ||
        !this.isOpen ||
        !this.root ||
        this.root.contains(event.target)
      ) {
        return;
      }

      this.close();
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
          if (
            global.console &&
            typeof global.console.error === "function"
          ) {
            global.console.error(
              "[SnakeNavigation]",
              error
            );
          }
        }
      });
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.root) {
        this.root.removeEventListener(
          "click",
          this.boundClick
        );

        this.root.removeEventListener(
          "keydown",
          this.boundKeydown
        );
      }

      if (typeof document !== "undefined") {
        document.removeEventListener(
          "click",
          this.boundDocumentClick
        );
      }

      this.listeners.clear();
      this.destroyed = true;
      this.root = null;
    }
  }

  global.SnakeNavigation = SnakeNavigation;
})(window);