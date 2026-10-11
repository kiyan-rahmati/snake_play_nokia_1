(function (global) {
  "use strict";

  const AssetService = {
    basePath: "",
    manifest: {},
    cache: new Map(),
    pending: new Map(),
    initialized: false,
    timeout: 15000,

    init(options) {
      options = options || {};

      this.basePath = this.normalizeBasePath(
        options.basePath || ""
      );

      this.timeout = Number.isFinite(options.timeout)
        ? Math.max(1000, options.timeout)
        : 15000;

      this.manifest = Object.assign(
        {},
        options.manifest || {}
      );

      this.initialized = true;

      this.emit("assets:initialized", {
        basePath: this.basePath,
        manifestEntries: Object.keys(this.manifest).length
      });

      return this;
    },

    normalizeBasePath(path) {
      if (typeof path !== "string") return "";

      const normalized = path.trim();

      if (!normalized || normalized === "/") return "";

      return normalized.replace(/\/+$/, "");
    },

    resolve(path) {
      if (typeof path !== "string" || !path.trim()) {
        throw new TypeError("Asset path must be a non-empty string.");
      }

      const requestedPath = path.trim();
      const mappedPath = Object.prototype.hasOwnProperty.call(
        this.manifest,
        requestedPath
      )
        ? this.manifest[requestedPath]
        : requestedPath;

      if (
        typeof mappedPath !== "string" ||
        !mappedPath.trim()
      ) {
        throw new TypeError("Asset manifest contains an invalid path.");
      }

      const assetPath = mappedPath.trim();

      if (/^(javascript|data):/i.test(assetPath)) {
        throw new Error("Unsupported asset URL scheme.");
      }

      if (/^(https?:)?\/\//i.test(assetPath)) {
        return assetPath;
      }

      if (/^(blob|mailto|file):/i.test(assetPath)) {
        throw new Error("Unsupported asset URL scheme.");
      }

      const cleanPath = assetPath.replace(/^\/+/, "");

      return this.basePath
        ? `${this.basePath}/${cleanPath}`
        : cleanPath;
    },

    get(path) {
      return this.resolve(path);
    },

    has(path) {
      return Object.prototype.hasOwnProperty.call(
        this.manifest,
        path
      );
    },

    register(name, path) {
      if (
        typeof name !== "string" ||
        !name.trim() ||
        typeof path !== "string" ||
        !path.trim()
      ) {
        throw new TypeError(
          "Asset registration requires a name and path."
        );
      }

      this.manifest[name.trim()] = path.trim();

      this.emit("assets:registered", {
        name: name.trim(),
        path: path.trim()
      });

      return this.resolve(name.trim());
    },

    unregister(name) {
      if (!Object.prototype.hasOwnProperty.call(this.manifest, name)) {
        return false;
      }

      delete this.manifest[name];

      this.emit("assets:unregistered", { name });

      return true;
    },

    async loadImage(path, options) {
      options = options || {};

      const url = this.resolve(path);
      const cacheKey = `image:${url}`;

      if (!options.force && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      if (!options.force && this.pending.has(cacheKey)) {
        return this.pending.get(cacheKey);
      }

      const promise = new Promise((resolve, reject) => {
        if (typeof global.Image !== "function") {
          reject(new Error("Image loading is unavailable."));
          return;
        }

        const image = new global.Image();
        let settled = false;

        const timer = global.setTimeout(() => {
          finish(
            new Error(`Image loading timed out: ${url}`)
          );
        }, this.timeout);

        const finish = (error) => {
          if (settled) return;

          settled = true;
          global.clearTimeout(timer);

          image.onload = null;
          image.onerror = null;

          if (error) {
            reject(error);
            return;
          }

          this.cache.set(cacheKey, image);

          this.emit("assets:image-loaded", {
            path,
            url,
            width: image.naturalWidth,
            height: image.naturalHeight
          });

          resolve(image);
        };

        image.onload = () => finish(null);

        image.onerror = () => {
          finish(new Error(`Unable to load image: ${url}`));
        };

        if (options.crossOrigin) {
          image.crossOrigin = options.crossOrigin;
        }

        image.src = url;

        if (image.complete && image.naturalWidth > 0) {
          finish(null);
        }
      });

      this.pending.set(cacheKey, promise);

      try {
        return await promise;
      } catch (error) {
        this.emit("assets:image-error", {
          path,
          url,
          message: error.message
        });

        throw error;
      } finally {
        this.pending.delete(cacheKey);
      }
    },

    async loadJSON(path, options) {
      options = options || {};

      const url = this.resolve(path);
      const cacheKey = `json:${url}`;

      if (!options.force && this.cache.has(cacheKey)) {
        return this.clone(this.cache.get(cacheKey));
      }

      if (!options.force && this.pending.has(cacheKey)) {
        return this.clone(await this.pending.get(cacheKey));
      }

      if (typeof global.fetch !== "function") {
        throw new Error("Fetch is unavailable in this browser.");
      }

      const controller =
        typeof global.AbortController === "function"
          ? new global.AbortController()
          : null;

      const timer = global.setTimeout(() => {
        if (controller) controller.abort();
      }, this.timeout);

      const promise = global.fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: options.cache || "default",
        signal: controller ? controller.signal : undefined
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Unable to load JSON asset (${response.status}): ${url}`
            );
          }

          return response.json();
        })
        .then((data) => {
          this.cache.set(cacheKey, data);

          this.emit("assets:json-loaded", {
            path,
            url
          });

          return data;
        })
        .catch((error) => {
          if (error && error.name === "AbortError") {
            throw new Error(`JSON asset request timed out: ${url}`);
          }

          throw error;
        })
        .finally(() => {
          global.clearTimeout(timer);
          this.pending.delete(cacheKey);
        });

      this.pending.set(cacheKey, promise);

      try {
        return this.clone(await promise);
      } catch (error) {
        this.emit("assets:json-error", {
          path,
          url,
          message: error.message
        });

        throw error;
      }
    },

    async loadText(path, options) {
      options = options || {};

      const url = this.resolve(path);
      const cacheKey = `text:${url}`;

      if (!options.force && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      if (!options.force && this.pending.has(cacheKey)) {
        return this.pending.get(cacheKey);
      }

      if (typeof global.fetch !== "function") {
        throw new Error("Fetch is unavailable in this browser.");
      }

      const controller =
        typeof global.AbortController === "function"
          ? new global.AbortController()
          : null;

      const timer = global.setTimeout(() => {
        if (controller) controller.abort();
      }, this.timeout);

      const promise = global.fetch(url, {
        method: "GET",
        cache: options.cache || "default",
        signal: controller ? controller.signal : undefined
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Unable to load text asset (${response.status}): ${url}`
            );
          }

          return response.text();
        })
        .then((text) => {
          this.cache.set(cacheKey, text);

          this.emit("assets:text-loaded", {
            path,
            url
          });

          return text;
        })
        .catch((error) => {
          if (error && error.name === "AbortError") {
            throw new Error(`Text asset request timed out: ${url}`);
          }

          throw error;
        })
        .finally(() => {
          global.clearTimeout(timer);
          this.pending.delete(cacheKey);
        });

      this.pending.set(cacheKey, promise);

      try {
        return await promise;
      } catch (error) {
        this.emit("assets:text-error", {
          path,
          url,
          message: error.message
        });

        throw error;
      }
    },

    async preload(paths, options) {
      if (!Array.isArray(paths)) {
        throw new TypeError("Preload paths must be an array.");
      }

      const results = await Promise.allSettled(
        paths.map((entry) => {
          const item =
            typeof entry === "string"
              ? { path: entry, type: "image" }
              : entry;

          if (!item || typeof item.path !== "string") {
            return Promise.reject(
              new TypeError("Invalid preload entry.")
            );
          }

          switch (item.type || "image") {
            case "image":
              return this.loadImage(item.path, options);

            case "json":
              return this.loadJSON(item.path, options);

            case "text":
              return this.loadText(item.path, options);

            default:
              return Promise.reject(
                new Error(`Unsupported asset type: ${item.type}`)
              );
          }
        })
      );

      const summary = {
        total: results.length,
        loaded: results.filter(
          (result) => result.status === "fulfilled"
        ).length,
        failed: results.filter(
          (result) => result.status === "rejected"
        ).length,
        results
      };

      this.emit("assets:preload-complete", {
        total: summary.total,
        loaded: summary.loaded,
        failed: summary.failed
      });

      return summary;
    },

    getCached(path, type) {
      const url = this.resolve(path);
      const key = `${type || "image"}:${url}`;

      return this.cache.has(key)
        ? this.cache.get(key)
        : null;
    },

    clearCache(path, type) {
      if (!path) {
        this.cache.clear();

        this.emit("assets:cache-cleared", {
          scope: "all"
        });

        return;
      }

      const url = this.resolve(path);
      const types = type
        ? [type]
        : ["image", "json", "text"];

      types.forEach((assetType) => {
        this.cache.delete(`${assetType}:${url}`);
      });

      this.emit("assets:cache-cleared", {
        path,
        type: type || "all"
      });
    },

    clone(value) {
      if (value === undefined || value === null) {
        return value;
      }

      if (typeof global.structuredClone === "function") {
        try {
          return global.structuredClone(value);
        } catch (_) {
          // Use JSON-compatible cloning below.
        }
      }

      if (typeof value !== "object") {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map((item) => this.clone(item));
      }

      const result = {};

      Object.keys(value).forEach((key) => {
        result[key] = this.clone(value[key]);
      });

      return result;
    },

    emit(eventName, detail) {
      const payload = Object.assign(
        {
          timestamp: Date.now()
        },
        detail || {}
      );

      if (
        global.SnakeAppEvents &&
        typeof global.SnakeAppEvents.emit === "function"
      ) {
        global.SnakeAppEvents.emit(eventName, payload);
      }

      if (typeof global.CustomEvent === "function") {
        global.dispatchEvent(
          new CustomEvent(eventName, {
            detail: payload
          })
        );
      }
    },

    destroy() {
      this.cache.clear();
      this.pending.clear();
      this.manifest = {};
      this.basePath = "";
      this.initialized = false;
    }
  };

  global.SnakeAssetService = AssetService;
})(window);