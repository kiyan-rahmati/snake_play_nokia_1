(function (global) {
  "use strict";

  class SnakeEffectsRenderer {
    constructor(options) {
      const settings = options || {};

      this.effects = new Map();
      this.particles = [];
      this.maxParticles = Math.max(
        1,
        Math.floor(Number(settings.maxParticles) || 500)
      );

      this.enabled = settings.enabled !== false;
      this.particleScale = Math.max(
        0,
        Number(settings.particleScale ?? 1)
      );

      this.defaultParticleColor = settings.defaultParticleColor || "#d7f7c2";
      this.defaultDuration = Math.max(
        1,
        Number(settings.defaultDuration) || 400
      );

      this.width = 0;
      this.height = 0;
      this.elapsedTime = 0;
      this.destroyed = false;
      this.nextParticleId = 1;
      this.nextEffectId = 1;
      this.listeners = new Map();

      this.presets = {
        food: {
          count: 12,
          color: "#ff5252",
          speed: 100,
          duration: 450,
          size: 3
        },
        growth: {
          count: 18,
          color: "#a8ff60",
          speed: 125,
          duration: 550,
          size: 3
        },
        collision: {
          count: 24,
          color: "#ff7043",
          speed: 180,
          duration: 650,
          size: 4
        },
        levelUp: {
          count: 35,
          color: "#ffd54f",
          speed: 150,
          duration: 1000,
          size: 4
        },
        teleport: {
          count: 20,
          color: "#80deea",
          speed: 130,
          duration: 700,
          size: 3
        }
      };
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeEffectsRenderer has been destroyed.");
      }
    }

    setEnabled(enabled) {
      this.assertAlive();

      this.enabled = Boolean(enabled);

      if (!this.enabled) {
        this.clearParticles();
      }

      this.emit("enabled-changed", {
        enabled: this.enabled
      });

      return this.enabled;
    }

    setParticleScale(scale) {
      this.assertAlive();

      const value = Number(scale);

      if (!Number.isFinite(value) || value < 0) {
        return false;
      }

      this.particleScale = value;
      return true;
    }

    setBounds(width, height) {
      this.assertAlive();

      const nextWidth = Number(width);
      const nextHeight = Number(height);

      if (
        !Number.isFinite(nextWidth) ||
        !Number.isFinite(nextHeight) ||
        nextWidth < 0 ||
        nextHeight < 0
      ) {
        return false;
      }

      this.width = nextWidth;
      this.height = nextHeight;

      return true;
    }

    registerPreset(name, configuration) {
      this.assertAlive();

      if (
        typeof name !== "string" ||
        !name.trim() ||
        !configuration ||
        typeof configuration !== "object"
      ) {
        return false;
      }

      this.presets[name] = Object.assign({}, configuration);
      return true;
    }

    getPreset(name) {
      this.assertAlive();

      const preset = this.presets[name];

      return preset ? Object.assign({}, preset) : null;
    }

    createParticle(configuration) {
      this.assertAlive();

      const settings = configuration || {};

      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const x = Number(settings.x);
      const y = Number(settings.y);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
      }

      const particle = {
        id: this.nextParticleId++,
        x: x,
        y: y,
        previousX: x,
        previousY: y,
        velocityX: Number(settings.velocityX) || 0,
        velocityY: Number(settings.velocityY) || 0,
        accelerationX: Number(settings.accelerationX) || 0,
        accelerationY: Number(settings.accelerationY) || 0,
        size: Math.max(0, Number(settings.size) || 3),
        color: settings.color || this.defaultParticleColor,
        alpha: Math.max(
          0,
          Math.min(1, Number(settings.alpha ?? 1))
        ),
        life: Math.max(
          1,
          Number(settings.duration) || this.defaultDuration
        ),
        remainingLife: Math.max(
          1,
          Number(settings.duration) || this.defaultDuration
        ),
        gravity: Number(settings.gravity) || 0,
        drag: Math.max(0, Math.min(1, Number(settings.drag) || 0)),
        shape: settings.shape || "circle",
        rotation: Number(settings.rotation) || 0,
        rotationSpeed: Number(settings.rotationSpeed) || 0,
        scale: Math.max(0, Number(settings.scale ?? 1)),
        fade: settings.fade !== false,
        shrink: settings.shrink === true,
        additive: settings.additive === true
      };

      this.particles.push(particle);

      return particle.id;
    }

    createBurst(x, y, options) {
      this.assertAlive();

      if (!this.enabled) {
        return null;
      }

      const settings = options || {};
      const count = Math.max(
        0,
        Math.floor(Number(settings.count) || 12)
      );

      const baseSpeed = Math.max(
        0,
        Number(settings.speed) || 100
      );

      const duration = Math.max(
        1,
        Number(settings.duration) || this.defaultDuration
      );

      const color = settings.color || this.defaultParticleColor;
      const size = Math.max(0, Number(settings.size) || 3);
      const spread = Math.max(0, Number(settings.spread) || Math.PI * 2);

      const originX = Number(x);
      const originY = Number(y);

      if (!Number.isFinite(originX) || !Number.isFinite(originY)) {
        return null;
      }

      const startAngle = Number(settings.startAngle) || 0;
      const ids = [];

      for (let i = 0; i < count; i += 1) {
        const angle = startAngle + Math.random() * spread;
        const speed = baseSpeed * (0.35 + Math.random() * 0.65);

        const id = this.createParticle({
          x: originX,
          y: originY,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed,
          size: size * (0.5 + Math.random()),
          color: color,
          duration: duration * (0.7 + Math.random() * 0.6),
          gravity: Number(settings.gravity) || 0,
          drag: Number(settings.drag) || 0,
          shape: settings.shape || "circle",
          rotationSpeed: (Math.random() - 0.5) * 5,
          fade: settings.fade !== false,
          shrink: settings.shrink === true,
          additive: settings.additive === true
        });

        if (id !== null) {
          ids.push(id);
        }
      }

      this.emit("burst-created", {
        x: originX,
        y: originY,
        count: ids.length,
        color: color
      });

      return ids;
    }

    createPreset(name, x, y, overrides) {
      this.assertAlive();

      const preset = this.presets[name];

      if (!preset) {
        return null;
      }

      const settings = Object.assign({}, preset, overrides || {});

      return this.createBurst(x, y, settings);
    }

    addEffect(name, configuration) {
      this.assertAlive();

      if (!this.enabled) {
        return null;
      }

      const settings = configuration || {};
      const id = this.nextEffectId++;

      const duration = Math.max(
        1,
        Number(settings.duration) || this.defaultDuration
      );

      this.effects.set(id, {
        id: id,
        name: String(name || "custom"),
        x: Number(settings.x) || 0,
        y: Number(settings.y) || 0,
        radius: Math.max(0, Number(settings.radius) || 0),
        color: settings.color || this.defaultParticleColor,
        duration: duration,
        remainingLife: duration,
        lineWidth: Math.max(0, Number(settings.lineWidth) || 2),
        maxRadius: Math.max(
          0,
          Number(settings.maxRadius) || Number(settings.radius) || 30
        ),
        startRadius: Math.max(0, Number(settings.startRadius) || 0),
        fade: settings.fade !== false,
        shape: settings.shape || "ring",
        rotation: Number(settings.rotation) || 0,
        rotationSpeed: Number(settings.rotationSpeed) || 0
      });

      this.emit("effect-added", {
        id: id,
        name: String(name || "custom")
      });

      return id;
    }

    removeEffect(id) {
      this.assertAlive();

      const removed = this.effects.delete(id);

      if (removed) {
        this.emit("effect-removed", {
          id: id
        });
      }

      return removed;
    }

    update(deltaTime) {
      this.assertAlive();

      if (!this.enabled) {
        return;
      }

      const delta = Math.max(
        0,
        Math.min(100, Number(deltaTime) || 0)
      );

      const seconds = delta / 1000;

      this.elapsedTime += delta;

      for (let i = this.particles.length - 1; i >= 0; i -= 1) {
        const particle = this.particles[i];

        particle.previousX = particle.x;
        particle.previousY = particle.y;

        particle.velocityX += particle.accelerationX * seconds;
        particle.velocityY +=
          (particle.accelerationY + particle.gravity) * seconds;

        const dragFactor = Math.max(
          0,
          1 - particle.drag * seconds
        );

        particle.velocityX *= dragFactor;
        particle.velocityY *= dragFactor;

        particle.x += particle.velocityX * seconds;
        particle.y += particle.velocityY * seconds;

        particle.rotation += particle.rotationSpeed * seconds;
        particle.remainingLife -= delta;

        if (particle.remainingLife <= 0) {
          this.particles.splice(i, 1);

          this.emit("particle-expired", {
            id: particle.id
          });
        }
      }

      this.effects.forEach((effect, id) => {
        effect.remainingLife -= delta;
        effect.rotation += effect.rotationSpeed * seconds;

        if (effect.remainingLife <= 0) {
          this.effects.delete(id);

          this.emit("effect-removed", {
            id: id
          });
        }
      });
    }

    render(context, effects, options) {
      this.assertAlive();

      if (!this.enabled || !context) {
        return false;
      }

      const settings = options || {};
      const deltaTime = Math.max(0, Number(settings.deltaTime) || 0);

      if (Number.isFinite(Number(settings.width))) {
        this.width = Number(settings.width);
      }

      if (Number.isFinite(Number(settings.height))) {
        this.height = Number(settings.height);
      }

      this.update(deltaTime);

      context.save();

      try {
        this.renderEffects(context);
        this.renderParticles(context);
      } finally {
        context.restore();
      }

      return true;
    }

    renderParticles(context) {
      this.particles.forEach((particle) => {
        const progress = Math.max(
          0,
          Math.min(1, particle.remainingLife / particle.life)
        );

        let alpha = particle.alpha;

        if (particle.fade) {
          alpha *= progress;
        }

        let size = particle.size * particle.scale * this.particleScale;

        if (particle.shrink) {
          size *= progress;
        }

        if (size <= 0 || alpha <= 0) {
          return;
        }

        context.save();

        context.globalAlpha = Math.max(0, Math.min(1, alpha));
        context.fillStyle = particle.color;

        if (particle.additive) {
          context.globalCompositeOperation = "lighter";
        }

        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);

        if (particle.shape === "square") {
          context.fillRect(-size / 2, -size / 2, size, size);
        } else if (particle.shape === "line") {
          context.strokeStyle = particle.color;
          context.lineWidth = Math.max(1, size);
          context.beginPath();
          context.moveTo(-size, 0);
          context.lineTo(size, 0);
          context.stroke();
        } else if (particle.shape === "star") {
          this.drawStar(context, size);
        } else {
          context.beginPath();
          context.arc(0, 0, size, 0, Math.PI * 2);
          context.fill();
        }

        context.restore();
      });
    }

    renderEffects(context) {
      this.effects.forEach((effect) => {
        const progress = Math.max(
          0,
          Math.min(1, effect.remainingLife / effect.duration)
        );

        const expansion = 1 - progress;

        const radius =
          effect.startRadius +
          (effect.maxRadius - effect.startRadius) * expansion;

        const alpha = effect.fade ? progress : 1;

        context.save();
        context.globalAlpha = alpha;
        context.strokeStyle = effect.color;
        context.fillStyle = effect.color;
        context.lineWidth = effect.lineWidth;

        context.translate(effect.x, effect.y);
        context.rotate(effect.rotation);

        if (effect.shape === "flash") {
          context.globalAlpha = alpha * 0.25;
          context.fillRect(
            -this.width / 2,
            -this.height / 2,
            this.width * 2,
            this.height * 2
          );
        } else if (effect.shape === "circle") {
          context.beginPath();
          context.arc(0, 0, radius, 0, Math.PI * 2);
          context.fill();
        } else if (effect.shape === "cross") {
          context.beginPath();
          context.moveTo(-radius, 0);
          context.lineTo(radius, 0);
          context.moveTo(0, -radius);
          context.lineTo(0, radius);
          context.stroke();
        } else {
          context.beginPath();
          context.arc(0, 0, radius, 0, Math.PI * 2);
          context.stroke();
        }

        context.restore();
      });
    }

    drawStar(context, radius) {
      const spikes = 5;
      const innerRadius = radius * 0.45;
      let rotation = -Math.PI / 2;

      context.beginPath();
      context.moveTo(
        Math.cos(rotation) * radius,
        Math.sin(rotation) * radius
      );

      for (let i = 0; i < spikes; i += 1) {
        rotation += Math.PI / spikes;

        context.lineTo(
          Math.cos(rotation) * innerRadius,
          Math.sin(rotation) * innerRadius
        );

        rotation += Math.PI / spikes;

        context.lineTo(
          Math.cos(rotation) * radius,
          Math.sin(rotation) * radius
        );
      }

      context.closePath();
      context.fill();
    }

    clearParticles() {
      this.assertAlive();

      const count = this.particles.length;
      this.particles.length = 0;

      this.emit("particles-cleared", {
        count: count
      });

      return count;
    }

    clearEffects() {
      this.assertAlive();

      const count = this.effects.size;
      this.effects.clear();

      this.emit("effects-cleared", {
        count: count
      });

      return count;
    }

    clear() {
      this.assertAlive();

      this.clearParticles();
      this.clearEffects();
    }

    getParticleCount() {
      this.assertAlive();
      return this.particles.length;
    }

    getEffectCount() {
      this.assertAlive();
      return this.effects.size;
    }

    getStats() {
      this.assertAlive();

      return {
        enabled: this.enabled,
        particleCount: this.particles.length,
        effectCount: this.effects.size,
        maxParticles: this.maxParticles,
        particleScale: this.particleScale,
        elapsedTime: this.elapsedTime
      };
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
          if (global.console && typeof global.console.error === "function") {
            global.console.error("[SnakeEffectsRenderer]", error);
          }
        }
      });
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this.particles.length = 0;
      this.effects.clear();
      this.listeners.clear();
      this.destroyed = true;
    }
  }

  global.SnakeEffectsRenderer = SnakeEffectsRenderer;
})(window);