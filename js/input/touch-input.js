(function (global) {
  "use strict";

  class SnakeTouchInput {
    constructor(options) {
      const settings = options || {};

      this.target = settings.target || global.document;
      this.enabled = settings.enabled !== false;
      this.threshold = Number(settings.threshold) || 24;
      this.tapThreshold = Number(settings.tapThreshold) || 180;
      this.listeners = new Map();
      this.destroyed = false;
      this.activeTouch = null;
      this.lastDirection = null;
      this.preventDefault = settings.preventDefault !== false;
      this.allowMultiTouch = settings.allowMultiTouch === true;

      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchMove = this.handleTouchMove.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
      this.handleTouchCancel = this.handleTouchCancel.bind(this);
      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerUp = this.handlePointerUp.bind(this);
      this.handlePointerCancel = this.handlePointerCancel.bind(this);
      this.handleContextMenu = this.handleContextMenu.bind(this);

      this.pointerSupported =
        typeof global.PointerEvent !== "undefined";

      this.bindEvents();
    }

    bindEvents() {
      if (!this.target || typeof this.target.addEventListener !== "function") {
        return;
      }

      if (this.pointerSupported) {
        this.target.addEventListener("pointerdown", this.handlePointerDown);
        this.target.addEventListener("pointermove", this.handlePointerMove);
        this.target.addEventListener("pointerup", this.handlePointerUp);
        this.target.addEventListener("pointercancel", this.handlePointerCancel);
      } else {
        this.target.addEventListener(
          "touchstart",
          this.handleTouchStart,
          { passive: false }
        );

        this.target.addEventListener(
          "touchmove",
          this.handleTouchMove,
          { passive: false }
        );

        this.target.addEventListener("touchend", this.handleTouchEnd);
        this.target.addEventListener("touchcancel", this.handleTouchCancel);
      }

      this.target.addEventListener("contextmenu", this.handleContextMenu);
    }

    unbindEvents() {
      if (!this.target || typeof this.target.removeEventListener !== "function") {
        return;
      }

      if (this.pointerSupported) {
        this.target.removeEventListener("pointerdown", this.handlePointerDown);
        this.target.removeEventListener("pointermove", this.handlePointerMove);
        this.target.removeEventListener("pointerup", this.handlePointerUp);
        this.target.removeEventListener(
          "pointercancel",
          this.handlePointerCancel
        );
      } else {
        this.target.removeEventListener("touchstart", this.handleTouchStart);
        this.target.removeEventListener("touchmove", this.handleTouchMove);
        this.target.removeEventListener("touchend", this.handleTouchEnd);
        this.target.removeEventListener("touchcancel", this.handleTouchCancel);
      }

      this.target.removeEventListener("contextmenu", this.handleContextMenu);
    }

    getPoint(event) {
      return {
        x: Number(event.clientX) || 0,
        y: Number(event.clientY) || 0,
        time: Date.now()
      };
    }

    handlePointerDown(event) {
      if (!this.enabled || this.destroyed) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (
        this.activeTouch &&
        !this.allowMultiTouch
      ) {
        return;
      }

      if (event.target && event.target.closest) {
        const excluded = event.target.closest(
          "button, input, textarea, select, a, [data-touch-ignore]"
        );

        if (excluded && !this.target.matches?.("[data-touch-capture]")) {
          return;
        }
      }

      const point = this.getPoint(event);

      this.activeTouch = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        startTime: point.time,
        pointerType: event.pointerType || "unknown",
        target: event.target
      };

      if (this.target.setPointerCapture && event.pointerId !== undefined) {
        try {
          this.target.setPointerCapture(event.pointerId);
        } catch (error) {
          // Pointer capture is optional.
        }
      }

      this.emit("start", {
        x: point.x,
        y: point.y,
        pointerType: event.pointerType || "unknown"
      });
    }

    handlePointerMove(event) {
      if (!this.enabled || !this.activeTouch || this.destroyed) {
        return;
      }

      if (event.pointerId !== this.activeTouch.pointerId) {
        return;
      }

      const point = this.getPoint(event);

      this.activeTouch.currentX = point.x;
      this.activeTouch.currentY = point.y;

      const deltaX = point.x - this.activeTouch.startX;
      const deltaY = point.y - this.activeTouch.startY;

      if (
        this.preventDefault &&
        event.cancelable &&
        (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)
      ) {
        event.preventDefault();
      }

      this.emit("move", {
        x: point.x,
        y: point.y,
        deltaX,
        deltaY,
        pointerType: this.activeTouch.pointerType
      });

      this.detectSwipe(deltaX, deltaY, false);
    }

    handlePointerUp(event) {
      if (!this.activeTouch || this.destroyed) {
        return;
      }

      if (event.pointerId !== this.activeTouch.pointerId) {
        return;
      }

      const point = this.getPoint(event);
      const touch = this.activeTouch;

      const deltaX = point.x - touch.startX;
      const deltaY = point.y - touch.startY;
      const duration = point.time - touch.startTime;

      this.finishGesture({
        deltaX,
        deltaY,
        duration,
        x: point.x,
        y: point.y,
        pointerType: touch.pointerType
      });

      this.activeTouch = null;
    }

    handlePointerCancel(event) {
      if (!this.activeTouch || this.destroyed) {
        return;
      }

      if (event.pointerId !== this.activeTouch.pointerId) {
        return;
      }

      this.emit("cancel", {
        pointerType: this.activeTouch.pointerType
      });

      this.activeTouch = null;
    }

    handleTouchStart(event) {
      if (!this.enabled || this.destroyed || !event.changedTouches) {
        return;
      }

      if (this.activeTouch && !this.allowMultiTouch) {
        return;
      }

      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      this.activeTouch = {
        pointerId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now(),
        pointerType: "touch",
        target: event.target
      };

      this.emit("start", {
        x: touch.clientX,
        y: touch.clientY,
        pointerType: "touch"
      });
    }

    handleTouchMove(event) {
      if (!this.enabled || !this.activeTouch || !event.changedTouches) {
        return;
      }

      const touch = this.findTouch(event.changedTouches);

      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - this.activeTouch.startX;
      const deltaY = touch.clientY - this.activeTouch.startY;

      this.activeTouch.currentX = touch.clientX;
      this.activeTouch.currentY = touch.clientY;

      if (
        this.preventDefault &&
        event.cancelable &&
        (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)
      ) {
        event.preventDefault();
      }

      this.emit("move", {
        x: touch.clientX,
        y: touch.clientY,
        deltaX,
        deltaY,
        pointerType: "touch"
      });

      this.detectSwipe(deltaX, deltaY, false);
    }

    handleTouchEnd(event) {
      if (!this.activeTouch || !event.changedTouches) {
        return;
      }

      const touch = this.findTouch(event.changedTouches);

      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - this.activeTouch.startX;
      const deltaY = touch.clientY - this.activeTouch.startY;
      const duration = Date.now() - this.activeTouch.startTime;

      this.finishGesture({
        deltaX,
        deltaY,
        duration,
        x: touch.clientX,
        y: touch.clientY,
        pointerType: "touch"
      });

      this.activeTouch = null;
    }

    handleTouchCancel(event) {
      if (!this.activeTouch) {
        return;
      }

      this.emit("cancel", {
        pointerType: "touch"
      });

      this.activeTouch = null;
    }

    findTouch(touchList) {
      if (!this.activeTouch || !touchList) {
        return null;
      }

      for (let index = 0; index < touchList.length; index += 1) {
        if (touchList[index].identifier === this.activeTouch.pointerId) {
          return touchList[index];
        }
      }

      return null;
    }

    detectSwipe(deltaX, deltaY, emitAction) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (Math.max(absX, absY) < this.threshold) {
        return null;
      }

      let direction;

      if (absX > absY) {
        direction = deltaX > 0 ? "right" : "left";
      } else {
        direction = deltaY > 0 ? "down" : "up";
      }

      if (emitAction && direction !== this.lastDirection) {
        this.lastDirection = direction;

        this.emit("swipe", {
          direction,
          deltaX,
          deltaY
        });

        this.emit("direction", {
          direction
        });
      }

      return direction;
    }

    finishGesture(gesture) {
      const { deltaX, deltaY, duration, x, y, pointerType } = gesture;
      const distance = Math.hypot(deltaX, deltaY);
      const direction = this.detectSwipe(deltaX, deltaY, false);

      if (direction) {
        this.emit("swipe", {
          direction,
          deltaX,
          deltaY,
          distance,
          duration,
          pointerType
        });

        this.emit("direction", {
          direction,
          pointerType
        });
      } else if (duration <= this.tapThreshold) {
        this.emit("tap", {
          x,
          y,
          duration,
          pointerType
        });
      }

      this.emit("end", {
        x,
        y,
        deltaX,
        deltaY,
        distance,
        duration,
        direction,
        pointerType
      });

      this.lastDirection = null;
    }

    handleContextMenu(event) {
      if (!this.enabled || !this.preventDefault || !event.cancelable) {
        return;
      }

      event.preventDefault();
    }

    on(eventName, callback) {
      if (this.destroyed) {
        throw new Error("SnakeTouchInput has been destroyed.");
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
            global.console.error("[SnakeTouchInput]", error);
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
      this.activeTouch = null;
      this.emit("disabled", {});
      return true;
    }

    getState() {
      return {
        enabled: this.enabled,
        destroyed: this.destroyed,
        active: Boolean(this.activeTouch),
        pointerSupported: this.pointerSupported,
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
      this.activeTouch = null;
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeTouchInput = SnakeTouchInput;
})(window);