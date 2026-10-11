(function (global) {
  "use strict";

  class AvatarManager {
    constructor(options) {
      const settings = options || {};

      this.defaultAvatar =
        settings.defaultAvatar || "assets/images/default-avatar.png";

      this.allowedExtensions = ["png", "jpg", "jpeg", "webp", "gif", "svg"];
      this.maxUrlLength = 500;
      this.maxFileSize = 2 * 1024 * 1024;
      this.maxDimension = 2048;
      this.objectUrls = new Set();
      this.currentAvatar = this.defaultAvatar;
    }

    initialize(avatar) {
      this.currentAvatar = this.isValidAvatar(avatar)
        ? avatar
        : this.defaultAvatar;

      return this.currentAvatar;
    }

    getCurrentAvatar() {
      return this.currentAvatar;
    }

    getDefaultAvatar() {
      return this.defaultAvatar;
    }

    isValidAvatar(value) {
      if (typeof value !== "string" || !value.trim()) {
        return false;
      }

      const avatar = value.trim();

      if (avatar.length > this.maxUrlLength) {
        return false;
      }

      if (/^https:\/\//i.test(avatar)) {
        try {
          const url = new URL(avatar);

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

      if (
        avatar.startsWith("assets/") &&
        !avatar.split("/").includes("..")
      ) {
        const extension = avatar.split(".").pop().toLowerCase();

        return this.allowedExtensions.includes(extension) &&
          /^[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|gif|svg)$/i.test(avatar);
      }

      return false;
    }

    setAvatar(value) {
      if (!this.isValidAvatar(value)) {
        throw new TypeError("Invalid avatar source.");
      }

      this.currentAvatar = value.trim();

      return this.currentAvatar;
    }

    async setAvatarFromFile(file) {
      if (!(file instanceof Blob)) {
        throw new TypeError("A valid image file is required.");
      }

      if (file.size <= 0 || file.size > this.maxFileSize) {
        throw new RangeError("Avatar file size is invalid.");
      }

      const allowedMimeTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif"
      ];

      if (!allowedMimeTypes.includes(file.type)) {
        throw new TypeError("Unsupported avatar image format.");
      }

      const dimensions = await this._readImageDimensions(file);

      if (
        dimensions.width > this.maxDimension ||
        dimensions.height > this.maxDimension
      ) {
        throw new RangeError("Avatar dimensions are too large.");
      }

      const objectUrl = URL.createObjectURL(file);

      this.objectUrls.add(objectUrl);
      this.currentAvatar = objectUrl;

      return {
        url: objectUrl,
        width: dimensions.width,
        height: dimensions.height,
        size: file.size,
        type: file.type
      };
    }

    _readImageDimensions(file) {
      return new Promise((resolve, reject) => {
        const temporaryUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
          const dimensions = {
            width: image.naturalWidth,
            height: image.naturalHeight
          };

          URL.revokeObjectURL(temporaryUrl);

          if (!dimensions.width || !dimensions.height) {
            reject(new Error("Unable to read image dimensions."));
            return;
          }

          resolve(dimensions);
        };

        image.onerror = () => {
          URL.revokeObjectURL(temporaryUrl);
          reject(new Error("Unable to load avatar image."));
        };

        image.src = temporaryUrl;
      });
    }

    applyToElement(element) {
      if (!(element instanceof HTMLImageElement)) {
        return false;
      }

      element.src = this.currentAvatar || this.defaultAvatar;
      element.alt = "Player avatar";
      element.loading = "lazy";
      element.decoding = "async";
      element.referrerPolicy = "no-referrer";

      element.onerror = () => {
        element.onerror = null;
        element.src = this.defaultAvatar;
      };

      return true;
    }

    revokeObjectUrl(url) {
      if (!this.objectUrls.has(url)) {
        return false;
      }

      URL.revokeObjectURL(url);
      this.objectUrls.delete(url);

      if (this.currentAvatar === url) {
        this.currentAvatar = this.defaultAvatar;
      }

      return true;
    }

    destroy() {
      for (const url of this.objectUrls) {
        URL.revokeObjectURL(url);
      }

      this.objectUrls.clear();
      this.currentAvatar = this.defaultAvatar;
    }
  }

  global.SnakeAvatarManager = AvatarManager;
})(window);