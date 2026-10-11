(function (global) {
  "use strict";

  let currentWorldId = null;
  let enabled = true;
  let currentTrack = null;

  function getAudioManager() {
    return global.SnakeAudioManager || null;
  }

  function setWorld(world) {
    if (!world || typeof world !== "object") {
      throw new TypeError("A valid world definition is required.");
    }

    currentWorldId = String(world.id);
    currentTrack = resolveTrack(world);

    if (!enabled || !currentTrack) {
      stop();
      emit("snake:world-audio-unavailable", {
        worldId: currentWorldId
      });
      return false;
    }

    const manager = getAudioManager();

    if (!manager) {
      emit("snake:world-audio-manager-missing", {
        worldId: currentWorldId,
        track: currentTrack
      });
      return false;
    }

    try {
      if (typeof manager.playMusic === "function") {
        manager.playMusic(currentTrack, { loop: true });
      } else if (typeof manager.playTrack === "function") {
        manager.playTrack(currentTrack, { loop: true });
      } else {
        emit("snake:world-audio-manager-unsupported", {
          worldId: currentWorldId
        });
        return false;
      }

      emit("snake:world-audio-started", {
        worldId: currentWorldId,
        track: currentTrack
      });

      return true;
    } catch (error) {
      emit("snake:world-audio-error", {
        worldId: currentWorldId,
        track: currentTrack,
        error
      });

      return false;
    }
  }

  function resolveTrack(world) {
    if (typeof world.musicTrack === "string" && world.musicTrack.trim()) {
      return world.musicTrack.trim();
    }

    if (
      world.audio &&
      typeof world.audio.music === "string" &&
      world.audio.music.trim()
    ) {
      return world.audio.music.trim();
    }

    return null;
  }

  function stop() {
    const manager = getAudioManager();

    if (manager) {
      try {
        if (typeof manager.stopMusic === "function") {
          manager.stopMusic();
        } else if (typeof manager.stopTrack === "function") {
          manager.stopTrack();
        }
      } catch (error) {
        emit("snake:world-audio-error", {
          worldId: currentWorldId,
          error
        });
      }
    }

    emit("snake:world-audio-stopped", {
      worldId: currentWorldId
    });
  }

  function setEnabled(value) {
    enabled = Boolean(value);

    if (!enabled) {
      stop();
    }

    emit("snake:world-audio-enabled-changed", {
      enabled
    });

    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  function getCurrentTrack() {
    return currentTrack;
  }

  function getCurrentWorldId() {
    return currentWorldId;
  }

  function emit(name, detail) {
    global.dispatchEvent(
      new CustomEvent(name, { detail })
    );
  }

  global.SnakeWorldAudioController = Object.freeze({
    setWorld,
    stop,
    setEnabled,
    isEnabled,
    getCurrentTrack,
    getCurrentWorldId
  });
})(window);