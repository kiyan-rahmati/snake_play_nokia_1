/**
 * Snake Nokia V2
 * Self Collision Handler
 */

(function (window) {
  "use strict";

  function create(options = {}) {
    const settings = {
      excludeHead: true,
      allowTailEntryWhenMoving: true,
      onCollision: null,
      ...options
    };

    let collisionCount = 0;
    let lastCollision = null;

    function isValidPosition(position) {
      return Boolean(
        position &&
        Number.isInteger(position.x) &&
        Number.isInteger(position.y)
      );
    }

    function samePosition(a, b) {
      return a.x === b.x && a.y === b.y;
    }

    function check(position, segments, options = {}) {
      if (!isValidPosition(position) || !Array.isArray(segments)) {
        return Object.freeze({
          collided: false,
          validInput: false,
          collision: null
        });
      }

      if (segments.length <= 1) {
        return Object.freeze({
          collided: false,
          validInput: true,
          collision: null
        });
      }

      const excludeHead = options.excludeHead ?? settings.excludeHead;
      const allowTailEntry =
        options.allowTailEntryWhenMoving ??
        settings.allowTailEntryWhenMoving;

      const startIndex = excludeHead ? 1 : 0;
      const body = segments.slice(startIndex);

      let candidates = body.map(function (segment, index) {
        return {
          segment,
          index: index + startIndex
        };
      });

      if (
        allowTailEntry &&
        options.isMoving !== false &&
        options.growing !== true &&
        candidates.length > 0
      ) {
        const tailIndex = candidates.length - 1;
        candidates = candidates.slice(0, tailIndex);
      }

      const match = candidates.find(function (candidate) {
        return (
          isValidPosition(candidate.segment) &&
          samePosition(position, candidate.segment)
        );
      });

      if (!match) {
        return Object.freeze({
          collided: false,
          validInput: true,
          collision: null
        });
      }

      const collision = Object.freeze({
        type: "self",
        position: Object.freeze({ ...position }),
        segmentIndex: match.index,
        fatal: true,
        timestamp: Date.now()
      });

      collisionCount += 1;
      lastCollision = collision;

      if (typeof settings.onCollision === "function") {
        settings.onCollision(collision);
      }

      return Object.freeze({
        collided: true,
        validInput: true,
        collision
      });
    }

    function hasCollision(position, segments, options = {}) {
      return check(position, segments, options).collided;
    }

    function getLastCollision() {
      return lastCollision;
    }

    function getStatistics() {
      return Object.freeze({
        collisionCount,
        lastCollision
      });
    }

    function resetStatistics() {
      collisionCount = 0;
      lastCollision = null;
    }

    function configure(nextSettings = {}) {
      Object.assign(settings, nextSettings);
      return Object.freeze({ ...settings });
    }

    return Object.freeze({
      check,
      hasCollision,
      getLastCollision,
      getStatistics,
      resetStatistics,
      configure
    });
  }

  window.SnakeSelfCollision = Object.freeze({
    create
  });
})(window);