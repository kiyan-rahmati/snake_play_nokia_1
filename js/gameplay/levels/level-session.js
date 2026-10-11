(function (global) {
  "use strict";

  let session = null;
  let sessionSequence = 0;

  function start(level, options = {}) {
    if (!level || typeof level !== "object") {
      throw new TypeError("A valid level definition is required.");
    }

    if (session && session.status === "active") {
      throw new Error("A level session is already active.");
    }

    const now = Date.now();

    session = {
      sessionId: ++sessionSequence,
      levelId: String(level.id),
      status: "active",
      startedAt: now,
      endedAt: null,
      elapsedMs: 0,
      score: 0,
      foodCollected: 0,
      deaths: 0,
      objectivesCompleted: [],
      objectives: Array.isArray(level.objectives)
        ? level.objectives.map((objective, index) => ({
            id: String(objective.id ?? index + 1),
            completed: false
          }))
        : [],
      metadata: {
        ...options.metadata
      }
    };

    emit("snake:level-session-started", getSnapshot());

    return getSnapshot();
  }

  function finish(status = "completed") {
    if (!session || session.status !== "active") {
      return null;
    }

    const allowedStatuses = ["completed", "failed", "abandoned"];

    if (!allowedStatuses.includes(status)) {
      throw new TypeError("Invalid level session status.");
    }

    const now = Date.now();

    session.status = status;
    session.endedAt = now;
    session.elapsedMs = Math.max(0, now - session.startedAt);

    emit("snake:level-session-finished", getSnapshot());

    return getSnapshot();
  }

  function addScore(points) {
    ensureActive();

    const amount = Number(points);

    if (!Number.isFinite(amount)) {
      throw new TypeError("Score must be a finite number.");
    }

    session.score = Math.max(0, session.score + Math.trunc(amount));

    emit("snake:level-session-score-changed", {
      sessionId: session.sessionId,
      score: session.score
    });

    return session.score;
  }

  function collectFood(amount = 1) {
    ensureActive();

    const count = Number(amount);

    if (!Number.isInteger(count) || count < 1) {
      throw new TypeError("Food count must be a positive integer.");
    }

    session.foodCollected += count;

    emit("snake:level-session-food-collected", {
      sessionId: session.sessionId,
      foodCollected: session.foodCollected
    });

    return session.foodCollected;
  }

  function recordDeath() {
    ensureActive();

    session.deaths += 1;

    emit("snake:level-session-death-recorded", {
      sessionId: session.sessionId,
      deaths: session.deaths
    });

    return session.deaths;
  }

  function completeObjective(objectiveId) {
    ensureActive();

    const id = String(objectiveId);
    const objective = session.objectives.find((item) => item.id === id);

    if (!objective || objective.completed) {
      return false;
    }

    objective.completed = true;
    session.objectivesCompleted.push(id);

    emit("snake:level-objective-completed", {
      sessionId: session.sessionId,
      objectiveId: id
    });

    return true;
  }

  function getSnapshot() {
    if (!session) {
      return null;
    }

    const currentTime = session.status === "active"
      ? Date.now()
      : session.endedAt;

    return {
      ...session,
      elapsedMs: Math.max(0, currentTime - session.startedAt),
      objectives: session.objectives.map((objective) => ({ ...objective })),
      objectivesCompleted: [...session.objectivesCompleted],
      metadata: { ...session.metadata }
    };
  }

  function getCurrent() {
    return getSnapshot();
  }

  function reset() {
    const previous = getSnapshot();
    session = null;

    emit("snake:level-session-reset", {
      previous
    });

    return previous;
  }

  function ensureActive() {
    if (!session || session.status !== "active") {
      throw new Error("No active level session.");
    }
  }

  function emit(name, detail) {
    global.dispatchEvent(new CustomEvent(name, { detail }));
  }

  global.SnakeLevelSession = Object.freeze({
    start,
    finish,
    addScore,
    collectFood,
    recordDeath,
    completeObjective,
    getCurrent,
    getSnapshot,
    reset
  });
})(window);