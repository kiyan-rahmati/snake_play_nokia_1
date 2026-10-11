/**
 * Snake Nokia V2
 * Speed System
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    initialSpeed: 7,
    minSpeed: 3,
    maxSpeed: 20,
    speedStep: 0.5,
    acceleration: 0,
    accelerationInterval: 10000
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    settings.minSpeed = Math.max(
      1,
      Number(settings.minSpeed) || DEFAULTS.minSpeed
    );

    settings.maxSpeed = Math.max(
      settings.minSpeed,
      Number(settings.maxSpeed) || DEFAULTS.maxSpeed
    );

    settings.speedStep = Math.max(
      0.1,
      Number(settings.speedStep) || DEFAULTS.speedStep
    );

    settings.initialSpeed = Math.min(
      settings.maxSpeed,
      Math.max(
        settings.minSpeed,
        Number(settings.initialSpeed) || DEFAULTS.initialSpeed
      )
    );

    let speed = settings.initialSpeed;
    let elapsedTime = 0;
    let accelerationElapsed = 0;
    let totalChanges = 0;
    let paused = false;
    let history = [];

    function record(type, previousSpeed, metadata = {}) {
      history.push(Object.freeze({
        type,
        previousSpeed,
        speed,
        timestamp: Date.now(),
        ...metadata
      }));

      if (history.length > 100) {
        history.shift();
      }
    }

    function setSpeed(value) {
      const next = Number(value);

      if (!Number.isFinite(next)) {
        return false;
      }

      const previousSpeed = speed;

      speed = Math.min(
        settings.maxSpeed,
        Math.max(settings.minSpeed, next)
      );

      if (speed !== previousSpeed) {
        totalChanges += 1;
        record("set", previousSpeed);
      }

      return speed;
    }

    function increase(amount = settings.speedStep) {
      const increment = Number(amount);

      if (!Number.isFinite(increment) || increment <= 0) {
        return speed;
      }

      const previousSpeed = speed;

      speed = Math.min(
        settings.maxSpeed,
        speed + increment
      );

      if (speed !== previousSpeed) {
        totalChanges += 1;
        record("increase", previousSpeed);
      }

      return speed;
    }

    function decrease(amount = settings.speedStep) {
      const decrement = Number(amount);

      if (!Number.isFinite(decrement) || decrement <= 0) {
        return speed;
      }

      const previousSpeed = speed;

      speed = Math.max(
        settings.minSpeed,
        speed - decrement
      );

      if (speed !== previousSpeed) {
        totalChanges += 1;
        record("decrease", previousSpeed);
      }

      return speed;
    }

    function update(deltaTime) {
      const delta = Number(deltaTime);

      if (
        paused ||
        !Number.isFinite(delta) ||
        delta <= 0
      ) {
        return getSnapshot();
      }

      elapsedTime += delta;
      accelerationElapsed += delta;

      const interval = Math.max(
        1,
        Number(settings.accelerationInterval) ||
          DEFAULTS.accelerationInterval
      );

      const acceleration = Number(settings.acceleration);

      if (
        Number.isFinite(acceleration) &&
        acceleration > 0
      ) {
        while (accelerationElapsed >= interval) {
          accelerationElapsed -= interval;
          increase(acceleration);
        }
      }

      return getSnapshot();
    }

    function setPaused(value) {
      paused = Boolean(value);
      return paused;
    }

    function isPaused() {
      return paused;
    }

    function getSpeed() {
      return speed;
    }

    function getTickInterval() {
      return 1000 / Math.max(1, speed);
    }

    function getElapsedTime() {
      return elapsedTime;
    }

    function getHistory() {
      return history.slice();
    }

    function getSnapshot() {
      return Object.freeze({
        speed,
        minSpeed: settings.minSpeed,
        maxSpeed: settings.maxSpeed,
        tickInterval: getTickInterval(),
        elapsedTime,
        accelerationElapsed,
        totalChanges,
        paused
      });
    }

    function reset(overrides = {}) {
      const initial = Number(
        overrides.initialSpeed ?? settings.initialSpeed
      );

      speed = Math.min(
        settings.maxSpeed,
        Math.max(
          settings.minSpeed,
          Number.isFinite(initial)
            ? initial
            : settings.initialSpeed
        )
      );

      elapsedTime = 0;
      accelerationElapsed = 0;
      totalChanges = 0;
      paused = false;
      history = [];

      return getSnapshot();
    }

    return Object.freeze({
      setSpeed,
      increase,
      decrease,
      update,
      setPaused,
      isPaused,
      getSpeed,
      getTickInterval,
      getElapsedTime,
      getHistory,
      getSnapshot,
      reset
    });
  }

  window.SnakeSpeedSystem = Object.freeze({
    create,
    DEFAULTS
  });
})(window);