/**
 * engine.js — pure game logic. No DOM, no timers, no rendering.
 * The app calls game.step() on every tick and reacts to the returned events.
 *
 * status: 'ready' -> 'running' <-> 'paused' -> 'over' | 'won'
 */
(function (global) {
  'use strict';
  const SP = (global.SP = global.SP || {});
  const DIRS = SP.CONST.DIRS;
  const OPPOSITE = SP.CONST.OPPOSITE;

  class Game {
    constructor(world, opts) {
      opts = opts || {};
      this.world = world;
      this.cols = world.cols;
      this.rows = world.rows;
      this.rng = opts.rng || Math.random;
      this.reset();
    }

    reset() {
      const midY = Math.floor(this.rows / 2);
      this.snake = [{ x: 4, y: midY }, { x: 3, y: midY }, { x: 2, y: midY }];
      this.dir = 'right';
      this.queue = [];
      this.obstacles = new Set();
      if (this.world.layout) {
        for (let y = 0; y < this.world.layout.length; y++) {
          for (let x = 0; x < this.world.layout[y].length; x++) {
            if (this.world.layout[y][x] === '#') this.obstacles.add(this.idx(x, y));
          }
        }
      }
      this.baseObstacles = this.obstacles.size;
      this.score = 0;
      this.eaten = 0;
      this.bonusEaten = 0;
      this.ticks = 0;
      this.pendingGrowth = 0;
      this.food = null;
      this.bonus = null;
      this.cleared = false;   // target score reached at least once
      this.perfect = false;   // board completely filled
      this.deathReason = null;
      this.status = 'ready';
      this.placeFood();
    }

    idx(x, y) { return y * this.cols + x; }
    get head() { return this.snake[0]; }
    get length() { return this.snake.length; }

    hasObstacle(x, y) { return this.obstacles.has(this.idx(x, y)); }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }

    /** Ticks per second for the current progress. */
    tps() {
      const s = this.world.speed;
      return Math.min(s.max, s.start + Math.floor(this.eaten / s.every) * s.step);
    }

    /** Speed shown to the player: 1 .. N */
    speedLevel() {
      const s = this.world.speed;
      return Math.round((this.tps() - s.start) / s.step) + 1;
    }

    start() { if (this.status === 'ready' || this.status === 'paused') this.status = 'running'; }
    pause() { if (this.status === 'running') this.status = 'paused'; }
    resume() { if (this.status === 'paused') this.status = 'running'; }

    /** After reaching the target the player may keep going in endless mode. */
    continueAfterWin() {
      if (this.status === 'won' && !this.perfect) this.status = 'running';
    }

    /** Queue a turn. Returns true if accepted. Up to 2 turns can be buffered. */
    setDirection(name) {
      if (this.status === 'over' || this.status === 'won' || !DIRS[name]) return false;
      const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
      if (name === last || name === OPPOSITE[last]) return false;
      if (this.queue.length >= 2) return false;
      this.queue.push(name);
      return true;
    }

    isFree(x, y) {
      if (!this.inBounds(x, y) || this.hasObstacle(x, y)) return false;
      for (let i = 0; i < this.snake.length; i++) {
        if (this.snake[i].x === x && this.snake[i].y === y) return false;
      }
      if (this.food && this.food.x === x && this.food.y === y) return false;
      if (this.bonus && this.bonus.x === x && this.bonus.y === y) return false;
      return true;
    }

    freeCells() {
      const out = [];
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) if (this.isFree(x, y)) out.push({ x: x, y: y });
      }
      return out;
    }

    pickFree() {
      const free = this.freeCells();
      if (!free.length) return null;
      return free[Math.floor(this.rng() * free.length)];
    }

    placeFood() {
      this.food = null;
      const cell = this.pickFree();
      if (!cell) return false;
      this.food = cell;
      return true;
    }

    placeBonus() {
      const b = this.world.bonus;
      if (!b || this.bonus) return;
      const cell = this.pickFree();
      if (cell) this.bonus = { x: cell.x, y: cell.y, ttl: b.ttl, max: b.ttl };
    }

    /** Neon world: add a lone barrier away from the head and away from other barriers. */
    addRandomObstacle() {
      const head = this.head;
      const wrap = this.world.wrap;
      const candidates = this.freeCells().filter((c) => {
        if (Math.max(Math.abs(c.x - head.x), Math.abs(c.y - head.y)) < 5) return false;
        if (!wrap && (c.x === 0 || c.y === 0 || c.x === this.cols - 1 || c.y === this.rows - 1)) return false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = c.x + dx, ny = c.y + dy;
            if (this.inBounds(nx, ny) && this.hasObstacle(nx, ny)) return false;
          }
        }
        return true;
      });
      if (!candidates.length) return null;
      const c = candidates[Math.floor(this.rng() * candidates.length)];
      this.obstacles.add(this.idx(c.x, c.y));
      return c;
    }

    die(reason, events) {
      this.status = 'over';
      this.deathReason = reason;
      events.push({ type: 'die', reason: reason });
      return events;
    }

    /** Advance one tick. Returns a list of events for sound/effects/UI. */
    step() {
      const events = [];
      if (this.status !== 'running') return events;

      if (this.queue.length) this.dir = this.queue.shift();
      const v = DIRS[this.dir];
      const head = this.head;
      let nx = head.x + v.x;
      let ny = head.y + v.y;

      if (this.world.wrap) {
        nx = (nx + this.cols) % this.cols;
        ny = (ny + this.rows) % this.rows;
      } else if (!this.inBounds(nx, ny)) {
        return this.die('wall', events);
      }

      if (this.hasObstacle(nx, ny)) return this.die('obstacle', events);

      const ate = !!this.food && nx === this.food.x && ny === this.food.y;
      const ateBonus = !!this.bonus && nx === this.bonus.x && ny === this.bonus.y;
      const growing = ate || ateBonus || this.pendingGrowth > 0;

      // The tail cell is free to enter this tick unless the snake is growing.
      const bodyCells = growing ? this.snake.length : this.snake.length - 1;
      for (let i = 0; i < bodyCells; i++) {
        if (this.snake[i].x === nx && this.snake[i].y === ny) return this.die('self', events);
      }

      this.snake.unshift({ x: nx, y: ny });
      if (growing) {
        if (!ate && !ateBonus) this.pendingGrowth--;
      } else {
        this.snake.pop();
      }
      this.ticks++;

      const w = this.world;

      if (ate) {
        this.score += w.foodPoints;
        this.eaten++;
        events.push({ type: 'eat', x: nx, y: ny, points: w.foodPoints });
        if (!this.placeFood()) {
          this.perfect = true;
          this.cleared = true;
          this.status = 'won';
          events.push({ type: 'win', perfect: true });
          return events;
        }
        if (w.bonus && this.eaten % w.bonus.every === 0) this.placeBonus();
        if (w.growObstacles && this.eaten % w.growObstacles.every === 0) {
          const placed = this.obstacles.size - this.baseObstacles < w.growObstacles.max
            ? this.addRandomObstacle() : null;
          if (placed) events.push({ type: 'obstacle', x: placed.x, y: placed.y });
        }
      }

      if (ateBonus) {
        this.score += w.bonus.points;
        this.bonusEaten++;
        this.pendingGrowth += w.bonus.growth - 1;
        events.push({ type: 'bonus', x: nx, y: ny, points: w.bonus.points });
        this.bonus = null;
      } else if (this.bonus) {
        this.bonus.ttl--;
        if (this.bonus.ttl <= 0) {
          events.push({ type: 'bonusGone', x: this.bonus.x, y: this.bonus.y });
          this.bonus = null;
        }
      }

      if (!this.cleared && this.score >= w.targetScore) {
        this.cleared = true;
        this.status = 'won';
        events.push({ type: 'win', perfect: false });
      }
      return events;
    }
  }

  SP.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
