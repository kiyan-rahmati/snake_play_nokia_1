(function (global) {
  "use strict";

  const DEFAULT_SUGGESTIONS = Object.freeze([
    "PixelSnake",
    "RetroPlayer",
    "NokiaMaster",
    "SnakeLegend",
    "PixelHunter",
    "NeonRunner",
    "ArcadeKing",
    "SnakeWizard",
    "GridWalker",
    "ClassicGamer",
    "PixelRider",
    "NokiaHero",
    "SnakeStorm",
    "NeonPixel",
    "RetroLegend",
    "ByteRunner",
    "SnakeNinja",
    "PixelDream",
    "ArcadeFox",
    "GridMaster"
  ]);

  class UsernameSuggestions {
    constructor(options) {
      const settings = options || {};

      this.suggestions = Array.isArray(settings.suggestions)
        ? settings.suggestions.slice()
        : DEFAULT_SUGGESTIONS.slice();

      this.maxSuggestions = Number.isInteger(settings.maxSuggestions)
        ? Math.max(1, Math.min(settings.maxSuggestions, 20))
        : 5;

      this.minLength = 3;
      this.maxLength = 24;
    }

    getAll() {
      return this.suggestions.slice();
    }

    suggest(input, options) {
      const settings = options || {};
      const limit = Number.isInteger(settings.limit)
        ? Math.max(1, Math.min(settings.limit, 20))
        : this.maxSuggestions;

      const existing = new Set(
        (Array.isArray(settings.existing) ? settings.existing : [])
          .filter((item) => typeof item === "string")
          .map((item) => item.toLowerCase())
      );

      const prefix = this._normalize(input);

      const candidates = this.suggestions
        .filter((name) => this._isValid(name))
        .filter((name) => !existing.has(name.toLowerCase()))
        .filter((name) => {
          return !prefix || name.toLowerCase().includes(prefix.toLowerCase());
        });

      return this._unique(candidates).slice(0, limit);
    }

    generate(input, options) {
      const settings = options || {};
      const limit = Number.isInteger(settings.limit)
        ? Math.max(1, Math.min(settings.limit, 20))
        : this.maxSuggestions;

      const base = this._normalize(input)
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 16);

      if (base.length < this.minLength) {
        return this.suggest("", settings).slice(0, limit);
      }

      const existing = new Set(
        (Array.isArray(settings.existing) ? settings.existing : [])
          .filter((item) => typeof item === "string")
          .map((item) => item.toLowerCase())
      );

      const suffixes = [
        "X",
        "Pro",
        "Player",
        "Pixel",
        "Retro",
        "Snake",
        "GG",
        "One",
        "99",
        "007",
        "Zone",
        "Quest"
      ];

      const results = [];

      for (const suffix of suffixes) {
        const candidate = `${base}${suffix}`.slice(0, this.maxLength);

        if (
          this._isValid(candidate) &&
          candidate.toLowerCase() !== base.toLowerCase() &&
          !existing.has(candidate.toLowerCase())
        ) {
          results.push(candidate);
        }
      }

      for (let number = 1; results.length < limit && number <= 99; number++) {
        const candidate = `${base}${number}`.slice(0, this.maxLength);

        if (
          this._isValid(candidate) &&
          !existing.has(candidate.toLowerCase())
        ) {
          results.push(candidate);
        }
      }

      return this._unique(results).slice(0, limit);
    }

    addSuggestion(username) {
      if (!this._isValid(username)) {
        return false;
      }

      const exists = this.suggestions.some(
        (item) => item.toLowerCase() === username.toLowerCase()
      );

      if (exists) {
        return false;
      }

      this.suggestions.push(username);
      return true;
    }

    removeSuggestion(username) {
      if (typeof username !== "string") {
        return false;
      }

      const index = this.suggestions.findIndex(
        (item) => item.toLowerCase() === username.toLowerCase()
      );

      if (index === -1) {
        return false;
      }

      this.suggestions.splice(index, 1);
      return true;
    }

    _normalize(value) {
      if (typeof value !== "string") {
        return "";
      }

      return value.trim().replace(/\s+/g, "");
    }

    _isValid(username) {
      if (typeof username !== "string") {
        return false;
      }

      if (
        username.length < this.minLength ||
        username.length > this.maxLength
      ) {
        return false;
      }

      return /^[a-zA-Z0-9_-]+$/.test(username);
    }

    _unique(items) {
      const seen = new Set();

      return items.filter((item) => {
        const normalized = item.toLowerCase();

        if (seen.has(normalized)) {
          return false;
        }

        seen.add(normalized);
        return true;
      });
    }
  }

  global.SnakeUsernameSuggestions = UsernameSuggestions;
})(window);