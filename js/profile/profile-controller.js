(function (global) {
  "use strict";

  class ProfileController {
    constructor(options) {
      const settings = options || {};

      this.model = settings.model || (
        typeof global.SnakeProfileModel === "function"
          ? new global.SnakeProfileModel()
          : null
      );

      this.storage = settings.storage || null;
      this.events = settings.events || global.SnakeAppEvents || null;
      this.initialized = false;
      this.unsubscribeModel = null;
      this.listeners = new Set();
    }

    initialize() {
      if (this.initialized) {
        return this.getProfile();
      }

      if (!this.model) {
        throw new Error("Profile model is unavailable.");
      }

      const savedProfile = this._loadSavedProfile();

      if (savedProfile && typeof savedProfile === "object") {
        try {
          const editableFields = {
            username: savedProfile.username,
            displayName: savedProfile.displayName,
            avatar: savedProfile.avatar,
            bio: savedProfile.bio,
            preferences: savedProfile.preferences
          };

          for (const key of Object.keys(editableFields)) {
            if (editableFields[key] === undefined) {
              delete editableFields[key];
            }
          }

          if (Object.keys(editableFields).length > 0) {
            this.model.update(editableFields);
          }

          if (savedProfile.statistics) {
            this.model.updateStatistics(savedProfile.statistics);
          }
        } catch (error) {
          this._log("Unable to restore saved profile.", error);
        }
      }

      if (typeof this.model.subscribe === "function") {
        this.unsubscribeModel = this.model.subscribe((event) => {
          this._emit("profile:changed", event);
        });
      }

      this.initialized = true;
      this._emit("profile:initialized", this.getProfile());

      return this.getProfile();
    }

    getProfile() {
      this._assertInitialized();

      return this.model.getProfile();
    }

    updateProfile(fields) {
      this._assertInitialized();

      const updatedProfile = this.model.update(fields);

      this._saveProfile(updatedProfile);
      this._emit("profile:updated", updatedProfile);

      return updatedProfile;
    }

    updateStatistics(changes) {
      this._assertInitialized();

      const statistics = this.model.updateStatistics(changes);

      this._saveProfile(this.getProfile());
      this._emit("profile:statistics-updated", statistics);

      return statistics;
    }

    incrementStatistic(key, amount) {
      this._assertInitialized();

      const result = this.model.incrementStatistic(key, amount);

      if (result !== false) {
        this._saveProfile(this.getProfile());
        this._emit("profile:statistics-updated", {
          key,
          value: result
        });
      }

      return result;
    }

    setPreference(key, value) {
      this._assertInitialized();

      const result = this.model.setPreference(key, value);

      if (result) {
        this._saveProfile(this.getProfile());

        this._emit("profile:preference-updated", {
          key,
          value
        });
      }

      return result;
    }

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener must be a function.");
      }

      this.listeners.add(listener);

      return () => {
        this.listeners.delete(listener);
      };
    }

    destroy() {
      if (typeof this.unsubscribeModel === "function") {
        this.unsubscribeModel();
      }

      this.unsubscribeModel = null;
      this.listeners.clear();
      this.initialized = false;
    }

    _loadSavedProfile() {
      try {
        if (this.storage && typeof this.storage.get === "function") {
          return this.storage.get("snake.profile");
        }

        if (global.localStorage) {
          const raw = global.localStorage.getItem("snake.profile");
          return raw ? JSON.parse(raw) : null;
        }
      } catch (error) {
        this._log("Unable to load saved profile.", error);
      }

      return null;
    }

    _saveProfile(profile) {
      try {
        if (this.storage && typeof this.storage.set === "function") {
          this.storage.set("snake.profile", profile);
          return true;
        }

        if (global.localStorage) {
          global.localStorage.setItem(
            "snake.profile",
            JSON.stringify(profile)
          );

          return true;
        }
      } catch (error) {
        this._log("Unable to save profile.", error);
      }

      return false;
    }

    _emit(type, detail) {
      const event = {
        type,
        detail,
        timestamp: Date.now()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          this._log("Profile event listener failed.", error);
        }
      }

      if (this.events && typeof this.events.emit === "function") {
        this.events.emit(type, detail);
      }
    }

    _assertInitialized() {
      if (!this.initialized || !this.model) {
        throw new Error("ProfileController has not been initialized.");
      }
    }

    _log(message, error) {
      if (global.console && typeof global.console.warn === "function") {
        global.console.warn(message, error || "");
      }
    }
  }

  global.SnakeProfileController = ProfileController;
})(window);