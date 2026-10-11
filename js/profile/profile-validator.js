(function (global) {
  "use strict";

  const RULES = Object.freeze({
    username: {
      minLength: 3,
      maxLength: 24,
      pattern: /^[a-zA-Z0-9_-]+$/
    },
    displayName: {
      maxLength: 40
    },
    bio: {
      maxLength: 160
    },
    avatar: {
      maxLength: 500
    }
  });

  class ProfileValidator {
    static validateProfile(profile) {
      const errors = {};

      if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        return {
          valid: false,
          errors: {
            profile: "A valid profile object is required."
          }
        };
      }

      const usernameResult = this.validateUsername(profile.username);

      if (!usernameResult.valid) {
        errors.username = usernameResult.message;
      }

      const displayNameResult = this.validateDisplayName(
        profile.displayName
      );

      if (!displayNameResult.valid) {
        errors.displayName = displayNameResult.message;
      }

      const bioResult = this.validateBio(profile.bio);

      if (!bioResult.valid) {
        errors.bio = bioResult.message;
      }

      const avatarResult = this.validateAvatar(profile.avatar);

      if (!avatarResult.valid) {
        errors.avatar = avatarResult.message;
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors
      };
    }

    static validateUsername(value) {
      if (typeof value !== "string") {
        return this._failure("Username must be text.");
      }

      const username = value.trim();
      const rule = RULES.username;

      if (username.length < rule.minLength) {
        return this._failure(
          `Username must contain at least ${rule.minLength} characters.`
        );
      }

      if (username.length > rule.maxLength) {
        return this._failure(
          `Username cannot exceed ${rule.maxLength} characters.`
        );
      }

      if (!rule.pattern.test(username)) {
        return this._failure(
          "Username may contain only letters, numbers, underscores, and hyphens."
        );
      }

      return this._success();
    }

    static validateDisplayName(value) {
      if (value == null || value === "") {
        return this._success();
      }

      if (typeof value !== "string") {
        return this._failure("Display name must be text.");
      }

      if (value.trim().length > RULES.displayName.maxLength) {
        return this._failure(
          `Display name cannot exceed ${RULES.displayName.maxLength} characters.`
        );
      }

      if (/[\u0000-\u001F\u007F]/.test(value)) {
        return this._failure(
          "Display name contains unsupported control characters."
        );
      }

      return this._success();
    }

    static validateBio(value) {
      if (value == null || value === "") {
        return this._success();
      }

      if (typeof value !== "string") {
        return this._failure("Bio must be text.");
      }

      if (value.length > RULES.bio.maxLength) {
        return this._failure(
          `Bio cannot exceed ${RULES.bio.maxLength} characters.`
        );
      }

      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
        return this._failure(
          "Bio contains unsupported control characters."
        );
      }

      return this._success();
    }

    static validateAvatar(value) {
      if (value == null || value === "") {
        return this._success();
      }

      if (typeof value !== "string") {
        return this._failure("Avatar must be a string.");
      }

      const avatar = value.trim();

      if (avatar.length > RULES.avatar.maxLength) {
        return this._failure("Avatar path is too long.");
      }

      if (/^https:\/\//i.test(avatar)) {
        try {
          const url = new URL(avatar);

          if (
            url.protocol !== "https:" ||
            !url.hostname ||
            url.username ||
            url.password
          ) {
            return this._failure("Avatar URL is invalid.");
          }

          return this._success();
        } catch {
          return this._failure("Avatar URL is invalid.");
        }
      }

      if (
        /^assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|gif|svg)$/i.test(avatar) &&
        !avatar.split("/").includes("..")
      ) {
        return this._success();
      }

      return this._failure(
        "Avatar must use HTTPS or a supported local asset path."
      );
    }

    static validatePreference(key, value) {
      const allowedValues = {
        theme: ["day", "night"],
        language: ["en", "fa"],
        soundEnabled: [true, false],
        musicEnabled: [true, false],
        reducedMotion: [true, false]
      };

      if (!Object.prototype.hasOwnProperty.call(allowedValues, key)) {
        return this._failure("Unknown preference.");
      }

      if (!allowedValues[key].includes(value)) {
        return this._failure("Invalid preference value.");
      }

      return this._success();
    }

    static validateStatistics(statistics) {
      if (
        !statistics ||
        typeof statistics !== "object" ||
        Array.isArray(statistics)
      ) {
        return this._failure("Statistics must be an object.");
      }

      for (const [key, value] of Object.entries(statistics)) {
        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0
        ) {
          return this._failure(
            `Statistic "${key}" must be a non-negative number.`
          );
        }
      }

      return this._success();
    }

    static _success() {
      return {
        valid: true,
        message: ""
      };
    }

    static _failure(message) {
      return {
        valid: false,
        message
      };
    }
  }

  global.SnakeProfileValidator = ProfileValidator;
})(window);