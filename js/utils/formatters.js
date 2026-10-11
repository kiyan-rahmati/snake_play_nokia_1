(function (global) {
  "use strict";

  const Formatters = {
    number(value, options) {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return "0";
      }

      return new Intl.NumberFormat(
        options && options.locale ? options.locale : "en-US",
        options && options.numberOptions ? options.numberOptions : {}
      ).format(numericValue);
    },

    compactNumber(value, locale) {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return "0";
      }

      return new Intl.NumberFormat(locale || "en-US", {
        notation: "compact",
        maximumFractionDigits: 1
      }).format(numericValue);
    },

    percentage(value, decimals) {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return "0%";
      }

      const digits = Number.isInteger(decimals)
        ? Math.max(0, Math.min(6, decimals))
        : 0;

      return `${numericValue.toFixed(digits)}%`;
    },

    duration(milliseconds, options) {
      const totalMilliseconds = Number(milliseconds);

      if (!Number.isFinite(totalMilliseconds)) {
        return "00:00";
      }

      const totalSeconds = Math.max(
        0,
        Math.floor(totalMilliseconds / 1000)
      );

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (value) => String(value).padStart(2, "0");

      if (options && options.showMilliseconds) {
        const remainder = Math.floor(
          Math.max(0, totalMilliseconds) % 1000
        );

        return `${hours > 0 ? `${pad(hours)}:` : ""}${pad(minutes)}:${pad(seconds)}.${String(remainder).padStart(3, "0")}`;
      }

      if (options && options.showHours) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      }

      if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
      }

      return `${pad(minutes)}:${pad(seconds)}`;
    },

    clockTime(date, options) {
      const value = date instanceof Date ? date : new Date(date);

      if (Number.isNaN(value.getTime())) {
        return "";
      }

      const locale = options && options.locale
        ? options.locale
        : "en-US";

      const formatOptions = {
        hour: "2-digit",
        minute: "2-digit"
      };

      if (options && options.seconds) {
        formatOptions.second = "2-digit";
      }

      if (options && options.hour12 !== undefined) {
        formatOptions.hour12 = Boolean(options.hour12);
      }

      return new Intl.DateTimeFormat(locale, formatOptions).format(value);
    },

    date(date, options) {
      const value = date instanceof Date ? date : new Date(date);

      if (Number.isNaN(value.getTime())) {
        return "";
      }

      const settings = options || {};

      return new Intl.DateTimeFormat(
        settings.locale || "en-US",
        settings.dateOptions || {
          year: "numeric",
          month: "short",
          day: "numeric"
        }
      ).format(value);
    },

    dateTime(date, options) {
      const value = date instanceof Date ? date : new Date(date);

      if (Number.isNaN(value.getTime())) {
        return "";
      }

      const settings = options || {};

      return new Intl.DateTimeFormat(
        settings.locale || "en-US",
        settings.dateTimeOptions || {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      ).format(value);
    },

    relativeTime(value, unit, options) {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return "";
      }

      const settings = options || {};
      const locale = settings.locale || "en-US";

      try {
        const formatter = new Intl.RelativeTimeFormat(locale, {
          numeric: settings.numeric || "auto",
          style: settings.style || "long"
        });

        return formatter.format(numericValue, unit || "second");
      } catch (error) {
        return `${numericValue} ${unit || "second"}`;
      }
    },

    score(value) {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return "0";
      }

      return Math.max(0, Math.floor(numericValue)).toLocaleString("en-US");
    },

    ordinal(value) {
      const numericValue = Math.floor(Number(value));

      if (!Number.isFinite(numericValue)) {
        return "";
      }

      const absoluteValue = Math.abs(numericValue);
      const lastTwoDigits = absoluteValue % 100;

      let suffix = "th";

      if (lastTwoDigits < 11 || lastTwoDigits > 13) {
        switch (absoluteValue % 10) {
          case 1:
            suffix = "st";
            break;
          case 2:
            suffix = "nd";
            break;
          case 3:
            suffix = "rd";
            break;
          default:
            suffix = "th";
        }
      }

      return `${numericValue}${suffix}`;
    },

    pad(value, length) {
      const targetLength = Math.max(0, Math.floor(Number(length) || 0));

      return String(value).padStart(targetLength, "0");
    },

    truncate(value, maxLength, suffix) {
      const text = String(value == null ? "" : value);
      const limit = Math.max(0, Math.floor(Number(maxLength) || 0));
      const ending = suffix === undefined ? "…" : String(suffix);

      if (text.length <= limit) {
        return text;
      }

      if (limit <= ending.length) {
        return ending.slice(0, limit);
      }

      return text.slice(0, limit - ending.length).trimEnd() + ending;
    },

    capitalize(value) {
      const text = String(value == null ? "" : value);

      if (!text) {
        return "";
      }

      return text.charAt(0).toLocaleUpperCase() + text.slice(1);
    },

    titleCase(value) {
      return String(value == null ? "" : value)
        .trim()
        .toLocaleLowerCase()
        .replace(/(^|[\s_-])([\p{L}\p{N}])/gu, (match, separator, character) => {
          return separator + character.toLocaleUpperCase();
        });
    },

    initials(value, maxCharacters) {
      const text = String(value == null ? "" : value).trim();

      if (!text) {
        return "";
      }

      const limit = Math.max(
        1,
        Math.floor(Number(maxCharacters) || 2)
      );

      return text
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, limit)
        .map((part) => Array.from(part)[0] || "")
        .join("")
        .toLocaleUpperCase();
    },

    slug(value) {
      return String(value == null ? "" : value)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },

    fileSize(bytes, options) {
      const size = Number(bytes);

      if (!Number.isFinite(size) || size < 0) {
        return "0 B";
      }

      const settings = options || {};
      const base = settings.binary ? 1024 : 1000;
      const units = settings.binary
        ? ["B", "KiB", "MiB", "GiB", "TiB"]
        : ["B", "kB", "MB", "GB", "TB"];

      if (size === 0) {
        return "0 B";
      }

      const exponent = Math.min(
        Math.floor(Math.log(size) / Math.log(base)),
        units.length - 1
      );

      const result = size / Math.pow(base, exponent);
      const decimals = exponent === 0 ? 0 : result >= 100 ? 0 : 1;

      return `${result.toFixed(decimals)} ${units[exponent]}`;
    },

    sanitizeText(value, fallback) {
      if (value === null || value === undefined) {
        return fallback === undefined ? "" : String(fallback);
      }

      return String(value)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim();
    },

    list(values, options) {
      if (!Array.isArray(values)) {
        return "";
      }

      const settings = options || {};

      return new Intl.ListFormat(settings.locale || "en-US", {
        style: settings.style || "long",
        type: settings.type || "conjunction"
      }).format(values.map(String));
    },

    gameResult(result, locale) {
      const key = String(result || "").toLowerCase();

      const labels = {
        won: "Victory",
        win: "Victory",
        lost: "Game Over",
        loss: "Game Over",
        paused: "Paused",
        playing: "Playing",
        ready: "Ready",
        completed: "Completed",
        abandoned: "Abandoned"
      };

      if (locale && locale.startsWith("fa")) {
        const persianLabels = {
          won: "پیروزی",
          win: "پیروزی",
          lost: "پایان بازی",
          loss: "پایان بازی",
          paused: "متوقف‌شده",
          playing: "در حال بازی",
          ready: "آماده",
          completed: "تکمیل‌شده",
          abandoned: "رهاشده"
        };

        return persianLabels[key] || String(result || "");
      }

      return labels[key] || String(result || "");
    },

    direction(value) {
      return value === "rtl" ? "rtl" : "ltr";
    },

    booleanLabel(value, locale) {
      if (locale && locale.startsWith("fa")) {
        return value ? "فعال" : "غیرفعال";
      }

      return value ? "On" : "Off";
    }
  };

  global.SnakeFormatters = Object.freeze(Formatters);
})(window);