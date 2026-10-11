/**
 * Snake Nokia V2
 * Power-Up System
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    enabled: true,
    maxActivePowerUps: 3,
    spawnChance: 0.15,
    defaultDuration: 8000,
    spawnInterval: 12000
  });

  const TYPES = Object.freeze({
    speed: {
      id: "speed",
      duration: 6000,
      multiplier: 1.5,
      color: "#ffcc00"
    },
    slow: {
      id: "slow",
      duration: 7000,
      multiplier: 0.65,
      color: "#36b9ff"
    },
    doubleScore: {
      id: "doubleScore",
      duration: 10000,
      multiplier: 2,
      color: "#b56cff"
    },
    shield: {
      id: "shield",
      duration: 8000,
      multiplier: 1,
      color: "#48e0a4"
    },
    extraLife: {
      id: "extraLife",
      duration: 0,
      multiplier: 1,
      color: "#ff6688"
    }
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    let activePowerUps = [];
    let collectedCount = 0;
    let expiredCount = 0;
    let nextId = 1;
    let lastSpawnAt = 0;
    let enabled = Boolean(settings.enabled);
    let history = [];

    function record(type, powerUp, metadata = {}) {
      history.push(Object.freeze({
        type,
        powerUp: powerUp ? { ...powerUp } : null,
        timestamp: Date.now(),
        ...metadata
      }));

      if (history.length > 100) {
        history.shift();
      }
    }

    function getDefinition(type) {
      const definition = TYPES[type];

      return definition
        ? { ...definition }
        : null;
    }

    function spawn(type, position = {}, options = {}) {
      if (
        !enabled ||
        activePowerUps.length >= settings.maxActivePowerUps
      ) {
        return null;
      }

      const definition = getDefinition(type);

      if (!definition) {
        return null;
      }

      const x = Number(position.x);
      const y = Number(position.y);

      if (!Number.isInteger(x) || !Number.isInteger(y)) {
        return null;
      }

      const now = Date.now();
      const duration = Math.max(
        0,
        Number(options.duration ?? definition.duration) || 0
      );

      const powerUp = Object.freeze({
        id: `power-up-${nextId++}`,
        type: definition.id,
        x,
        y,
        color: options.color || definition.color,
        multiplier: Number(
          options.multiplier ?? definition.multiplier
        ) || 1,
        duration,
        spawnedAt: now,
        expiresAt: duration > 0 ? now + duration : null,
        active: true
      });

      activePowerUps.push(powerUp);
      lastSpawnAt = now;

      record("spawn", powerUp);

      return { ...powerUp };
    }

    function spawnRandom(position, options = {}) {
      if (Math.random() > settings.spawnChance) {
        return null;
      }

      const availableTypes = Object.keys(TYPES);

      const type = availableTypes[
        Math.floor(Math.random() * availableTypes.length)
      ];

      return spawn(type, position, options);
    }

    function collect(id) {
      const index = activePowerUps.findIndex(
        (item) => item.id === id
      );

      if (index === -1) {
        return null;
      }

      const [powerUp] = activePowerUps.splice(index, 1);

      collectedCount += 1;
      record("collect", powerUp);

      return Object.freeze({
        ...powerUp,
        collectedAt: Date.now()
      });
    }

    function collectAt(x, y) {
      const powerUp = activePowerUps.find(
        (item) =>
          item.x === Number(x) &&
          item.y === Number(y)
      );

      return powerUp ? collect(powerUp.id) : null;
    }

    function update(now = Date.now()) {
      const currentTime = Number(now);

      if (!Number.isFinite(currentTime)) {
        return getSnapshot();
      }

      const expired = [];

      activePowerUps = activePowerUps.filter((powerUp) => {
        if (
          powerUp.expiresAt !== null &&
          currentTime >= powerUp.expiresAt
        ) {
          expired.push(powerUp);
          return false;
        }

        return true;
      });

      expired.forEach((powerUp) => {
        expiredCount += 1;
        record("expire", powerUp);
      });

      return getSnapshot();
    }

    function getActiveEffects(now = Date.now()) {
      update(now);

      return activePowerUps.map((powerUp) => ({
        ...powerUp
      }));
    }

    function hasEffect(type, now = Date.now()) {
      update(now);

      return activePowerUps.some(
        (powerUp) => powerUp.type === type
      );
    }

    function getMultiplier(type, now = Date.now()) {
      update(now);

      const matching = activePowerUps.filter(
        (powerUp) => powerUp.type === type
      );

      if (matching.length === 0) {
        return 1;
      }

      return matching.reduce(
        (result, powerUp) => result * powerUp.multiplier,
        1
      );
    }

    function getScoreMultiplier(now = Date.now()) {
      return getMultiplier("doubleScore", now);
    }

    function getSpeedMultiplier(now = Date.now()) {
      const speedUp = getMultiplier("speed", now);
      const slowDown = getMultiplier("slow", now);

      return speedUp * slowDown;
    }

    function getCount() {
      return activePowerUps.length;
    }

    function getCollectedCount() {
      return collectedCount;
    }

    function getExpiredCount() {
      return expiredCount;
    }

    function getPowerUpAt(x, y) {
      const powerUp = activePowerUps.find(
        (item) =>
          item.x === Number(x) &&
          item.y === Number(y)
      );

      return powerUp ? { ...powerUp } : null;
    }

    function getHistory() {
      return history.slice();
    }

    function setEnabled(value) {
      enabled = Boolean(value);

      if (!enabled) {
        clear();
      }

      return enabled;
    }

    function isEnabled() {
      return enabled;
    }

    function clear() {
      const count = activePowerUps.length;
      activePowerUps = [];

      record("clear", null, { count });

      return count;
    }

    function getSnapshot(now = Date.now()) {
      update(now);

      return Object.freeze({
        enabled,
        activeCount: activePowerUps.length,
        maxActivePowerUps: settings.maxActivePowerUps,
        collectedCount,
        expiredCount,
        scoreMultiplier: getScoreMultiplier(now),
        speedMultiplier: getSpeedMultiplier(now),
        shieldActive: hasEffect("shield", now),
        extraLifeAvailable: hasEffect("extraLife", now),
        powerUps: activePowerUps.map((item) => ({ ...item }))
      });
    }

    function reset() {
      activePowerUps = [];
      collectedCount = 0;
      expiredCount = 0;
      nextId = 1;
      lastSpawnAt = 0;
      enabled = Boolean(settings.enabled);
      history = [];

      return getSnapshot();
    }

    return Object.freeze({
      spawn,
      spawnRandom,
      collect,
      collectAt,
      update,
      getDefinition,
      getActiveEffects,
      hasEffect,
      getMultiplier,
      getScoreMultiplier,
      getSpeedMultiplier,
      getCount,
      getCollectedCount,
      getExpiredCount,
      getPowerUpAt,
      getHistory,
      setEnabled,
      isEnabled,
      clear,
      getSnapshot,
      reset
    });
  }

  window.SnakePowerUpSystem = Object.freeze({
    create,
    TYPES,
    DEFAULTS
  });
})(window);