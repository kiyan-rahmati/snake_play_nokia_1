(function (global) {
  "use strict";

  const Random = {
    random() {
      return Math.random();
    },

    integer(minimum, maximum) {
      this.validateRange(minimum, maximum, true);

      return (
        Math.floor(Math.random() * (maximum - minimum + 1)) +
        minimum
      );
    },

    float(minimum, maximum) {
      this.validateRange(minimum, maximum, false);

      return Math.random() * (maximum - minimum) + minimum;
    },

    boolean(probability) {
      const chance = probability === undefined ? 0.5 : probability;

      if (
        typeof chance !== "number" ||
        !Number.isFinite(chance) ||
        chance < 0 ||
        chance > 1
      ) {
        throw new RangeError("Probability must be between 0 and 1.");
      }

      return Math.random() < chance;
    },

    pick(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return undefined;
      }

      return items[this.integer(0, items.length - 1)];
    },

    pickWeighted(items, weightSelector) {
      if (!Array.isArray(items) || items.length === 0) {
        return undefined;
      }

      const getWeight =
        typeof weightSelector === "function"
          ? weightSelector
          : (item) => item && item.weight;

      const weightedItems = items.map((item, index) => {
        const weight = Number(getWeight(item, index));

        if (!Number.isFinite(weight) || weight < 0) {
          throw new RangeError("Weights must be finite and non-negative.");
        }

        return { item, weight };
      });

      const totalWeight = weightedItems.reduce(
        (total, entry) => total + entry.weight,
        0
      );

      if (totalWeight <= 0) {
        return undefined;
      }

      let threshold = Math.random() * totalWeight;

      for (const entry of weightedItems) {
        threshold -= entry.weight;

        if (threshold < 0) {
          return entry.item;
        }
      }

      return weightedItems[weightedItems.length - 1].item;
    },

    shuffle(items) {
      if (!Array.isArray(items)) {
        throw new TypeError("Shuffle requires an array.");
      }

      const result = items.slice();

      for (let index = result.length - 1; index > 0; index -= 1) {
        const target = this.integer(0, index);

        [result[index], result[target]] = [
          result[target],
          result[index]
        ];
      }

      return result;
    },

    sample(items, count) {
      if (!Array.isArray(items)) {
        throw new TypeError("Sample requires an array.");
      }

      if (!Number.isInteger(count) || count < 0) {
        throw new RangeError("Sample count must be a non-negative integer.");
      }

      return this.shuffle(items).slice(0, Math.min(count, items.length));
    },

    chance(percent) {
      if (
        typeof percent !== "number" ||
        !Number.isFinite(percent) ||
        percent < 0 ||
        percent > 100
      ) {
        throw new RangeError("Percentage must be between 0 and 100.");
      }

      return Math.random() * 100 < percent;
    },

    sign() {
      return Math.random() < 0.5 ? -1 : 1;
    },

    nonRepeatingInteger(minimum, maximum, previous) {
      this.validateRange(minimum, maximum, true);

      if (minimum === maximum) return minimum;

      let result = this.integer(minimum, maximum);

      if (result === previous) {
        const offset = this.integer(1, maximum - minimum);
        result = minimum + ((result - minimum + offset) % (maximum - minimum + 1));
      }

      return result;
    },

    pointInRectangle(x, y, width, height) {
      this.validateRange(width, 0, false);
      this.validateRange(height, 0, false);

      return {
        x: x + Math.random() * width,
        y: y + Math.random() * height
      };
    },

    gridPosition(columns, rows) {
      if (
        !Number.isInteger(columns) ||
        !Number.isInteger(rows) ||
        columns < 1 ||
        rows < 1
      ) {
        throw new RangeError("Grid dimensions must be positive integers.");
      }

      return {
        x: this.integer(0, columns - 1),
        y: this.integer(0, rows - 1)
      };
    },

    freeGridPosition(columns, rows, occupied, maximumAttempts) {
      if (
        !Number.isInteger(columns) ||
        !Number.isInteger(rows) ||
        columns < 1 ||
        rows < 1
      ) {
        throw new RangeError("Grid dimensions must be positive integers.");
      }

      const occupiedSet = this.createPositionSet(occupied);
      const totalCells = columns * rows;

      if (occupiedSet.size >= totalCells) {
        return null;
      }

      const attempts = Number.isInteger(maximumAttempts)
        ? Math.max(1, maximumAttempts)
        : Math.min(totalCells, 100);

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const position = this.gridPosition(columns, rows);

        if (!occupiedSet.has(this.positionKey(position))) {
          return position;
        }
      }

      const start = this.integer(0, totalCells - 1);
      const stride = this.coprimeStride(totalCells);

      for (let index = 0; index < totalCells; index += 1) {
        const cell = (start + index * stride) % totalCells;

        const position = {
          x: cell % columns,
          y: Math.floor(cell / columns)
        };

        if (!occupiedSet.has(this.positionKey(position))) {
          return position;
        }
      }

      return null;
    },

    createPositionSet(positions) {
      if (!Array.isArray(positions)) {
        return new Set();
      }

      return new Set(
        positions
          .filter(
            (position) =>
              position &&
              Number.isFinite(position.x) &&
              Number.isFinite(position.y)
          )
          .map((position) => this.positionKey(position))
      );
    },

    positionKey(position) {
      return `${position.x},${position.y}`;
    },

    coprimeStride(limit) {
      if (limit <= 1) return 1;

      let stride = this.integer(1, limit - 1);

      while (this.gcd(stride, limit) !== 1) {
        stride += 1;

        if (stride >= limit) {
          stride = 1;
        }
      }

      return stride;
    },

    gcd(first, second) {
      let a = Math.abs(first);
      let b = Math.abs(second);

      while (b !== 0) {
        const remainder = a % b;
        a = b;
        b = remainder;
      }

      return a;
    },

    shuffleInPlace(items) {
      if (!Array.isArray(items)) {
        throw new TypeError("Shuffle requires an array.");
      }

      for (let index = items.length - 1; index > 0; index -= 1) {
        const target = this.integer(0, index);

        [items[index], items[target]] = [
          items[target],
          items[index]
        ];
      }

      return items;
    },

    secureInteger(minimum, maximum) {
      this.validateRange(minimum, maximum, true);

      const cryptoObject = global.crypto;

      if (
        !cryptoObject ||
        typeof cryptoObject.getRandomValues !== "function"
      ) {
        throw new Error("Cryptographically secure randomness is unavailable.");
      }

      const range = maximum - minimum + 1;

      if (range <= 0 || range > 4294967296) {
        throw new RangeError("Secure random integer range is unsupported.");
      }

      const uint32Range = 4294967296;
      const limit = Math.floor(uint32Range / range) * range;
      const buffer = new Uint32Array(1);

      let value;

      do {
        cryptoObject.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);

      return minimum + (value % range);
    },

    validateRange(minimum, maximum, integersOnly) {
      if (
        typeof minimum !== "number" ||
        typeof maximum !== "number" ||
        !Number.isFinite(minimum) ||
        !Number.isFinite(maximum) ||
        minimum > maximum
      ) {
        throw new RangeError("Invalid random number range.");
      }

      if (
        integersOnly &&
        (!Number.isInteger(minimum) || !Number.isInteger(maximum))
      ) {
        throw new TypeError("Range boundaries must be integers.");
      }
    }
  };

  global.SnakeRandom = Object.freeze(Random);
})(window);