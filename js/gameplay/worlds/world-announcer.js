(function (global) {
  "use strict";

  const DEFAULT_DURATION = 3000;

  let currentAnnouncement = null;
  let announcementTimer = null;
  let announcementSequence = 0;

  function announce(world, options = {}) {
    if (!world || typeof world !== "object") {
      throw new TypeError("A valid world definition is required.");
    }

    clear();

    const id = ++announcementSequence;
    const duration = normalizeDuration(options.duration);

    const announcement = {
      id,
      worldId: String(world.id),
      title: String(world.name || world.title || world.id),
      subtitle: String(world.description || ""),
      image: typeof world.introImage === "string"
        ? world.introImage
        : null,
      duration,
      startedAt: Date.now()
    };

    currentAnnouncement = announcement;

    emit("snake:world-announcement-start", {
      ...announcement
    });

    if (duration > 0) {
      announcementTimer = global.setTimeout(() => {
        if (
          currentAnnouncement &&
          currentAnnouncement.id === id
        ) {
          dismiss("timeout");
        }
      }, duration);
    }

    return getCurrent();
  }

  function dismiss(reason = "manual") {
    if (!currentAnnouncement) {
      return false;
    }

    const announcement = currentAnnouncement;

    if (announcementTimer !== null) {
      global.clearTimeout(announcementTimer);
      announcementTimer = null;
    }

    currentAnnouncement = null;

    emit("snake:world-announcement-dismissed", {
      ...announcement,
      reason,
      dismissedAt: Date.now()
    });

    return true;
  }

  function clear() {
    if (announcementTimer !== null) {
      global.clearTimeout(announcementTimer);
      announcementTimer = null;
    }

    currentAnnouncement = null;
  }

  function getCurrent() {
    return currentAnnouncement
      ? { ...currentAnnouncement }
      : null;
  }

  function isVisible() {
    return currentAnnouncement !== null;
  }

  function normalizeDuration(value) {
    const duration = value === undefined
      ? DEFAULT_DURATION
      : Number(value);

    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError(
        "Announcement duration must be a non-negative number."
      );
    }

    return Math.floor(duration);
  }

  function emit(name, detail) {
    global.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  global.SnakeWorldAnnouncer = Object.freeze({
    announce,
    dismiss,
    clear,
    getCurrent,
    isVisible,
    DEFAULT_DURATION
  });
})(window);