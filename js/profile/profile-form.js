(function (global) {
  "use strict";

  class ProfileForm {
    constructor(options) {
      const settings = options || {};

      this.controller = settings.controller || null;
      this.form = null;
      this.errorContainer = null;
      this.successContainer = null;
      this.submitButton = null;
      this.boundSubmit = this._handleSubmit.bind(this);
      this.boundInput = this._handleInput.bind(this);
    }

    initialize(formSelector) {
      this.form = document.querySelector(
        formSelector || "#profile-form"
      );

      if (!this.form) {
        return false;
      }

      if (!this.controller) {
        this._showError("Profile controller is unavailable.");
        return false;
      }

      this.errorContainer = this.form.querySelector(
        "[data-profile-error]"
      );

      this.successContainer = this.form.querySelector(
        "[data-profile-success]"
      );

      this.submitButton = this.form.querySelector(
        '[type="submit"]'
      );

      this.form.addEventListener("submit", this.boundSubmit);
      this.form.addEventListener("input", this.boundInput);

      this.populate(this.controller.getProfile());

      return true;
    }

    populate(profile) {
      if (!this.form || !profile) {
        return;
      }

      const fields = {
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio
      };

      for (const [name, value] of Object.entries(fields)) {
        const field = this.form.elements.namedItem(name);

        if (field && typeof value === "string") {
          field.value = value;
        }
      }

      const avatarField = this.form.elements.namedItem("avatar");

      if (avatarField && typeof profile.avatar === "string") {
        avatarField.value = profile.avatar;
      }

      this._clearMessages();
    }

    async _handleSubmit(event) {
      event.preventDefault();

      if (!this.form || !this.controller) {
        return;
      }

      this._clearMessages();

      const formData = new FormData(this.form);

      const fields = {
        username: String(formData.get("username") || "").trim(),
        displayName: String(formData.get("displayName") || "").trim(),
        bio: String(formData.get("bio") || "").trim(),
        avatar: String(formData.get("avatar") || "").trim() || null
      };

      const validation = this._validate(fields);

      if (!validation.valid) {
        this._showError(validation.message);
        return;
      }

      this._setSubmitting(true);

      try {
        this.controller.updateProfile(fields);
        this._showSuccess("Profile saved successfully.");

        this.form.dispatchEvent(
          new CustomEvent("profile:saved", {
            bubbles: true,
            detail: this.controller.getProfile()
          })
        );
      } catch (error) {
        this._showError(
          error && error.message
            ? error.message
            : "Unable to save your profile."
        );
      } finally {
        this._setSubmitting(false);
      }
    }

    _handleInput(event) {
      const field = event.target;

      if (!field || !field.name) {
        return;
      }

      field.removeAttribute("aria-invalid");

      const fieldError = this.form.querySelector(
        `[data-error-for="${this._escapeSelector(field.name)}"]`
      );

      if (fieldError) {
        fieldError.textContent = "";
        fieldError.hidden = true;
      }

      this._clearMessages();
    }

    _validate(fields) {
      if (!fields.username) {
        return {
          valid: false,
          message: "Username is required."
        };
      }

      if (!/^[a-zA-Z0-9_-]{3,24}$/.test(fields.username)) {
        return {
          valid: false,
          message: "Username must contain 3–24 letters, numbers, underscores, or hyphens."
        };
      }

      if (fields.displayName.length > 40) {
        return {
          valid: false,
          message: "Display name must be 40 characters or fewer."
        };
      }

      if (fields.bio.length > 160) {
        return {
          valid: false,
          message: "Bio must be 160 characters or fewer."
        };
      }

      if (fields.avatar && !this._isSafeAvatar(fields.avatar)) {
        return {
          valid: false,
          message: "Avatar must be a valid HTTPS image URL or a local asset path."
        };
      }

      return { valid: true, message: "" };
    }

    _isSafeAvatar(value) {
      if (/^https:\/\//i.test(value)) {
        try {
          const url = new URL(value);

          return (
            url.protocol === "https:" &&
            Boolean(url.hostname) &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      }

      return (
        /^assets\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|gif|svg)$/i.test(value) &&
        !value.includes("..")
      );
    }

    _showError(message) {
      if (this.errorContainer) {
        this.errorContainer.textContent = message;
        this.errorContainer.hidden = false;
        this.errorContainer.setAttribute("role", "alert");
      }
    }

    _showSuccess(message) {
      if (this.successContainer) {
        this.successContainer.textContent = message;
        this.successContainer.hidden = false;
        this.successContainer.setAttribute("role", "status");
      }
    }

    _clearMessages() {
      if (this.errorContainer) {
        this.errorContainer.textContent = "";
        this.errorContainer.hidden = true;
      }

      if (this.successContainer) {
        this.successContainer.textContent = "";
        this.successContainer.hidden = true;
      }
    }

    _setSubmitting(isSubmitting) {
      if (this.submitButton) {
        this.submitButton.disabled = isSubmitting;
        this.submitButton.setAttribute(
          "aria-busy",
          String(isSubmitting)
        );
      }
    }

    _escapeSelector(value) {
      if (global.CSS && typeof global.CSS.escape === "function") {
        return global.CSS.escape(value);
      }

      return value.replace(/["\\]/g, "\\$&");
    }

    destroy() {
      if (this.form) {
        this.form.removeEventListener("submit", this.boundSubmit);
        this.form.removeEventListener("input", this.boundInput);
      }

      this.form = null;
      this.errorContainer = null;
      this.successContainer = null;
      this.submitButton = null;
    }
  }

  global.SnakeProfileForm = ProfileForm;
})(window);