/**
 * Snake Nokia V2
 * Lives System
 */

(function (window) {
  "use strict";

  const DEFAULTS = Object.freeze({
    initialLives: 3,
    maxLives: 5,
    allowExtraLives: true,
    invulnerabilityDuration: 1500
  });

  function create(options = {}) {
    const settings = {
      ...DEFAULTS,
      ...options
    };

    settings.maxLives = Math.max(
      1,
      Math.floor(Number(settings.maxLives) || DEFAULTS.maxLives)
    );

    settings.initialLives = Math.min(
      settings.maxLives,
      Math.max(
        0,
        Math.floor(Number(settings.initialLives) || 0)
      )
    );

    let lives = settings.initialLives;
    let lostLives = 0;
    let extraLivesEarned = 0;
    let invulnerableUntil = 0;
    let gameOver = lives <= 0;
    let history = [];

    function record(type, amount = 1, metadata = {}) {
      history.push(Object.freeze({
        type,
        amount,
        lives,
        timestamp: Date.now(),
        metadata: { ...metadata }
      }));

      if (history.length > 100) {
        history.shift();
      }
    }

    function loseLife(metadata = {}) {
      if (gameOver || isInvulnerable()) {
        return Object.freeze({
          success: false,
          lives,
          gameOver,
          reason: gameOver ? "game-over" : "invulnerable"
        });
      }

      lives = Math.max(0, lives - 1);
      lostLives += 1;
      gameOver = lives === 0;

      record("lose", 1, metadata);

      return Object.freeze({
        success: true,
        lives,
        lostLives,
        gameOver
      });
    }

    function addLife(amount = 1, metadata = {}) {
      if (!settings.allowExtraLives || gameOver) {
        return Object.freeze({
          success: false,
          added: 0,
          lives,
          reason: gameOver ? "game-over" : "disabled"
        });
      }

      const requested = Number(amount);

      if (!Number.isFinite(requested) || requested <= 0) {
        return Object.freeze({
          success: false,
          added: 0,
          lives,
          reason: "invalid-amount"
        });
      }

      const count = Math.floor(requested);
      const added = Math.min(count, settings.maxLives - lives);

      if (added <= 0) {
        return Object.freeze({
          success: false,
          added: 0,
          lives,
          reason: "max-lives-reached"
        });
      }

      lives += added;
      extraLivesEarned += added;

      record("add", added, metadata);

      return Object.freeze({
        success: true,
        added,
        lives,
        extraLivesEarned
      });
    }

    function setLives(value) {
      const next = Number(value);

      if (!Number.isFinite(next) || next < 0) {
        return false;
      }

      lives = Math.min(
        settings.maxLives,
        Math.floor(next)
      );

      gameOver = lives === 0;

      record("set", lives, {});

      return true;
    }

    function activateInvulnerability(duration) {
      const requested = Number(duration);
      const safeDuration = Number.isFinite(requested)
        ? Math.max(0, requested)
        : settings.invulnerabilityDuration;

      invulnerableUntil = Date.now() + safeDuration;

      return invulnerableUntil;
    }

    function isInvulnerable() {
      return Date.now() < invulnerableUntil;
    }

    function getInvulnerabilityRemaining() {
      return Math.max(0, invulnerableUntil - Date.now());
    }

    function clearInvulnerability() {
      invulnerableUntil = 0;
    }

    function getLives() {
      return lives;
    }

    function getMaxLives() {
      return settings.maxLives;
    }

    function getLostLives() {
      return lostLives;
    }

    function getExtraLivesEarned() {
      return extraLivesEarned;
    }

    function isGameOver() {
      return gameOver;
    }

    function getHistory() {
      return history.slice();
    }

    function getSnapshot() {
      return Object.freeze({
        lives,
        maxLives: settings.maxLives,
        lostLives,
        extraLivesEarned,
        gameOver,
        invulnerable: isInvulnerable(),
        invulnerabilityRemaining: getInvulnerabilityRemaining()
      });
    }

    function reset(overrides = {}) {
      const requestedLives = Number(
        overrides.initialLives ?? settings.initialLives
      );

      lives = Math.min(
        settings.maxLives,
        Math.max(
          0,
          Number.isFinite(requestedLives)
            ? Math.floor(requestedLives)
            : settings.initialLives
        )
      );

      lostLives = 0;
      extraLivesEarned = 0;
      invulnerableUntil = 0;
      gameOver = lives === 0;
      history = [];

      return getSnapshot();
    }

    return Object.freeze({
      loseLife,
      addLife,
      setLives,
      activateInvulnerability,
      isInvulnerable,
      getInvulnerabilityRemaining,
      clearInvulnerability,
      getLives,
      getMaxLives,
      getLostLives,
      getExtraLivesEarned,
      isGameOver,
      getHistory,
      getSnapshot,
      reset
    });
  }

  window.SnakeLivesSystem = Object.freeze({
    create,
    DEFAULTS
  });
})(window);