(function (global) {
  "use strict";

  const DOM = {
    get(selector, root) {
      const context = root || document;
      return typeof selector === "string"
        ? context.querySelector(selector)
        : selector || null;
    },

    getAll(selector, root) {
      const context = root || document;

      if (typeof selector !== "string") {
        return selector ? Array.from(selector) : [];
      }

      return Array.from(context.querySelectorAll(selector));
    },

    byId(id) {
      return document.getElementById(id);
    },

    create(tagName, options) {
      if (typeof tagName !== "string" || !tagName.trim()) {
        throw new TypeError("A valid element tag name is required.");
      }

      const settings = options || {};
      const element = document.createElement(tagName);

      if (settings.className) {
        element.className = settings.className;
      }

      if (settings.id) {
        element.id = settings.id;
      }

      if (settings.text !== undefined) {
        element.textContent = String(settings.text);
      }

      if (settings.attributes) {
        Object.entries(settings.attributes).forEach(([name, value]) => {
          if (value !== null && value !== undefined) {
            element.setAttribute(name, String(value));
          }
        });
      }

      if (settings.dataset) {
        Object.entries(settings.dataset).forEach(([name, value]) => {
          if (value !== null && value !== undefined) {
            element.dataset[name] = String(value);
          }
        });
      }

      if (settings.styles) {
        Object.assign(element.style, settings.styles);
      }

      if (settings.classes) {
        element.classList.add(...settings.classes.filter(Boolean));
      }

      if (settings.children) {
        this.append(element, settings.children);
      }

      return element;
    },

    append(parent, children) {
      if (!parent || typeof parent.appendChild !== "function") {
        return parent;
      }

      const list = Array.isArray(children) ? children : [children];

      list.forEach((child) => {
        if (child === null || child === undefined || child === false) {
          return;
        }

        if (child.nodeType) {
          parent.appendChild(child);
        } else {
          parent.appendChild(document.createTextNode(String(child)));
        }
      });

      return parent;
    },

    prepend(parent, children) {
      if (!parent || typeof parent.insertBefore !== "function") {
        return parent;
      }

      const list = Array.isArray(children) ? children : [children];
      const fragment = document.createDocumentFragment();

      list.forEach((child) => {
        if (child === null || child === undefined || child === false) {
          return;
        }

        fragment.appendChild(
          child.nodeType
            ? child
            : document.createTextNode(String(child))
        );
      });

      parent.insertBefore(fragment, parent.firstChild);

      return parent;
    },

    remove(element) {
      const target = this.get(element);

      if (target && target.parentNode) {
        target.parentNode.removeChild(target);
        return true;
      }

      return false;
    },

    empty(element) {
      const target = this.get(element);

      if (target) {
        target.replaceChildren();
      }

      return target;
    },

    text(element, value) {
      const target = this.get(element);

      if (!target) {
        return value === undefined ? "" : null;
      }

      if (value === undefined) {
        return target.textContent;
      }

      target.textContent = String(value);
      return target;
    },

    html(element, value) {
      const target = this.get(element);

      if (!target) {
        return value === undefined ? "" : null;
      }

      if (value === undefined) {
        return target.innerHTML;
      }

      target.innerHTML = String(value);
      return target;
    },

    value(element, value) {
      const target = this.get(element);

      if (!target || !("value" in target)) {
        return value === undefined ? "" : null;
      }

      if (value === undefined) {
        return target.value;
      }

      target.value = value;
      return target;
    },

    attr(element, name, value) {
      const target = this.get(element);

      if (!target || !name) {
        return value === undefined ? null : target;
      }

      if (value === undefined) {
        return target.getAttribute(name);
      }

      if (value === null || value === false) {
        target.removeAttribute(name);
      } else {
        target.setAttribute(name, value === true ? "" : String(value));
      }

      return target;
    },

    data(element, name, value) {
      const target = this.get(element);

      if (!target || !target.dataset || !name) {
        return value === undefined ? undefined : target;
      }

      if (value === undefined) {
        return target.dataset[name];
      }

      if (value === null) {
        delete target.dataset[name];
      } else {
        target.dataset[name] = String(value);
      }

      return target;
    },

    addClass(element, ...classNames) {
      const target = this.get(element);

      if (target) {
        target.classList.add(...classNames.flat().filter(Boolean));
      }

      return target;
    },

    removeClass(element, ...classNames) {
      const target = this.get(element);

      if (target) {
        target.classList.remove(...classNames.flat().filter(Boolean));
      }

      return target;
    },

    toggleClass(element, className, force) {
      const target = this.get(element);

      if (!target) {
        return false;
      }

      return force === undefined
        ? target.classList.toggle(className)
        : target.classList.toggle(className, Boolean(force));
    },

    hasClass(element, className) {
      const target = this.get(element);
      return Boolean(target && target.classList.contains(className));
    },

    show(element, displayValue) {
      const target = this.get(element);

      if (!target) {
        return null;
      }

      if (target.dataset.domPreviousDisplay !== undefined) {
        target.style.display = target.dataset.domPreviousDisplay;
        delete target.dataset.domPreviousDisplay;
      } else {
        target.style.removeProperty("display");
      }

      if (global.getComputedStyle(target).display === "none") {
        target.style.display = displayValue || "block";
      }

      target.removeAttribute("hidden");

      return target;
    },

    hide(element) {
      const target = this.get(element);

      if (!target) {
        return null;
      }

      if (target.style.display !== "none") {
        target.dataset.domPreviousDisplay = target.style.display;
      }

      target.style.display = "none";

      return target;
    },

    isVisible(element) {
      const target = this.get(element);

      if (!target || !target.isConnected) {
        return false;
      }

      const styles = global.getComputedStyle(target);

      return (
        styles.display !== "none" &&
        styles.visibility !== "hidden" &&
        styles.visibility !== "collapse" &&
        target.getClientRects().length > 0
      );
    },

    enable(element) {
      const target = this.get(element);

      if (target && "disabled" in target) {
        target.disabled = false;
      }

      return target;
    },

    disable(element) {
      const target = this.get(element);

      if (target && "disabled" in target) {
        target.disabled = true;
      }

      return target;
    },

    on(element, eventName, handler, options) {
      const target = this.get(element);

      if (
        !target ||
        typeof eventName !== "string" ||
        typeof handler !== "function"
      ) {
        return () => {};
      }

      target.addEventListener(eventName, handler, options);

      return () => {
        target.removeEventListener(eventName, handler, options);
      };
    },

    once(element, eventName, handler, options) {
      const target = this.get(element);

      if (!target || typeof handler !== "function") {
        return () => {};
      }

      const settings =
        typeof options === "boolean"
          ? { capture: options, once: true }
          : { ...(options || {}), once: true };

      target.addEventListener(eventName, handler, settings);

      return () => {
        target.removeEventListener(eventName, handler, settings);
      };
    },

    delegate(root, eventName, selector, handler, options) {
      const container = this.get(root);

      if (!container || typeof handler !== "function") {
        return () => {};
      }

      const listener = (event) => {
        const origin =
          event.target && event.target.nodeType === Node.ELEMENT_NODE
            ? event.target
            : event.target && event.target.parentElement;

        const matched = origin && origin.closest(selector);

        if (matched && container.contains(matched)) {
          handler.call(matched, event, matched);
        }
      };

      container.addEventListener(eventName, listener, options);

      return () => {
        container.removeEventListener(eventName, listener, options);
      };
    },

    dispatch(element, eventName, detail, options) {
      const target = this.get(element);

      if (!target || typeof eventName !== "string") {
        return false;
      }

      const event = new CustomEvent(eventName, {
        bubbles: options ? options.bubbles !== false : true,
        cancelable: Boolean(options && options.cancelable),
        detail
      });

      return target.dispatchEvent(event);
    },

    closest(element, selector) {
      const target = this.get(element);
      return target && typeof target.closest === "function"
        ? target.closest(selector)
        : null;
    },

    contains(parent, child) {
      const parentElement = this.get(parent);
      const childElement = this.get(child);

      return Boolean(
        parentElement &&
        childElement &&
        parentElement.contains(childElement)
      );
    },

    focus(element, options) {
      const target = this.get(element);

      if (target && typeof target.focus === "function") {
        target.focus(options);
        return true;
      }

      return false;
    },

    blur(element) {
      const target = this.get(element);

      if (target && typeof target.blur === "function") {
        target.blur();
        return true;
      }

      return false;
    },

    scrollIntoView(element, options) {
      const target = this.get(element);

      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView(
          options || { behavior: "smooth", block: "nearest" }
        );
        return true;
      }

      return false;
    },

    createFragment(children) {
      const fragment = document.createDocumentFragment();

      this.append(fragment, children);

      return fragment;
    },

    ready(callback) {
      if (typeof callback !== "function") {
        return () => {};
      }

      if (document.readyState !== "loading") {
        callback();
        return () => {};
      }

      const listener = () => {
        document.removeEventListener("DOMContentLoaded", listener);
        callback();
      };

      document.addEventListener("DOMContentLoaded", listener);

      return () => {
        document.removeEventListener("DOMContentLoaded", listener);
      };
    },

    observe(element, callback, options) {
      const target = this.get(element);

      if (
        !target ||
        typeof callback !== "function" ||
        typeof global.MutationObserver !== "function"
      ) {
        return null;
      }

      const observer = new global.MutationObserver(callback);

      observer.observe(
        target,
        options || {
          childList: true,
          subtree: true,
          attributes: true
        }
      );

      return observer;
    },

    rect(element) {
      const target = this.get(element);

      if (!target || typeof target.getBoundingClientRect !== "function") {
        return null;
      }

      const rect = target.getBoundingClientRect();

      return {
        x: rect.x,
        y: rect.y,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
    },

    escapeHTML(value) {
      return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        };

        return entities[character];
      });
    },

    isElement(value) {
      return Boolean(
        value &&
        typeof value === "object" &&
        value.nodeType === Node.ELEMENT_NODE
      );
    },

    isInput(element) {
      const target = this.get(element);

      return Boolean(
        target &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      );
    },

    isInteractive(element) {
      const target = this.get(element);

      if (!target) {
        return false;
      }

      return Boolean(
        target.matches(
          "input, textarea, select, button, a, [contenteditable='true'], [role='button']"
        )
      );
    }
  };

  global.SnakeDOM = Object.freeze(DOM);
})(window);