/**
 * renderer.js — draws a Game onto a <canvas>.
 * Styles: 'lcd' (flat Nokia pixels), 'pixel', 'maze', 'neon' (glow).
 * All drawing happens in CSS pixels; the canvas backing store is scaled by devicePixelRatio.
 */
(function (global) {
  'use strict';
  const SP = (global.SP = global.SP || {});
  const DIRS = SP.CONST.DIRS;

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
      Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function star(ctx, cx, cy, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.shakeUntil = 0;
      this.shakeMag = 0;
      this.showGrid = true;
      this.cell = 20;
      this.dpr = 1;
      this.lastNow = 0;
      this.world = null;
      this.fx = null;
    }

    setWorld(world) {
      this.world = world;
      this.pal = world.palette;
      this.style = world.style;
      this.particles = [];
      this.resize();
    }

    /** Fit the board into its container while keeping square cells. */
    resize() {
      if (!this.world) return;
      const w = this.world;
      const wrap = this.canvas.parentElement;
      const availW = Math.max(160, wrap.clientWidth);
      const availH = Math.max(160, global.innerHeight - 300);
      this.cell = Math.max(8, Math.floor(Math.min(availW / w.cols, availH / w.rows)));
      this.dpr = Math.min(global.devicePixelRatio || 1, 3);
      const cssW = w.cols * this.cell, cssH = w.rows * this.cell;
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
      this.canvas.width = Math.round(cssW * this.dpr);
      this.canvas.height = Math.round(cssH * this.dpr);
      this.buildFxLayer(cssW, cssH);
    }

    /** Cached overlay: vignette (all worlds) + scanlines (LCD worlds). */
    buildFxLayer(W, H) {
      const c = document.createElement('canvas');
      c.width = Math.round(W * this.dpr);
      c.height = Math.round(H * this.dpr);
      const g = c.getContext('2d');
      g.scale(this.dpr, this.dpr);
      const grad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, this.style === 'lcd' ? 'rgba(20,35,10,0.28)' : 'rgba(0,0,0,0.38)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      if (this.style === 'lcd') {
        g.fillStyle = 'rgba(20,35,10,0.07)';
        for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
      }
      this.fx = c;
    }

    burst(cx, cy, color, count) {
      const c = this.cell;
      for (let i = 0; i < (count || 12); i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.04 + Math.random() * 0.12) * c;
        this.particles.push({
          x: (cx + 0.5) * c, y: (cy + 0.5) * c,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0, max: 380 + Math.random() * 300,
          size: c * (0.1 + Math.random() * 0.14), color: color,
        });
      }
    }

    shake(ms, magnitude) {
      this.shakeUntil = performance.now() + ms;
      this.shakeDuration = ms;
      this.shakeMag = magnitude || this.cell * 0.5;
    }

    /* ------------------------------------------------------------------ */

    render(game, now) {
      if (!this.world) return;
      const ctx = this.ctx;
      const c = this.cell;
      const W = game.cols * c, H = game.rows * c;
      const dt = this.lastNow ? Math.min(60, now - this.lastNow) : 16;
      this.lastNow = now;

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (now < this.shakeUntil) {
        const k = (this.shakeUntil - now) / (this.shakeDuration || 300);
        ctx.translate((Math.random() - 0.5) * this.shakeMag * k, (Math.random() - 0.5) * this.shakeMag * k);
      }

      this.drawBoard(ctx, game, W, H, now);
      this.drawObstacles(ctx, game, now);
      this.drawFood(ctx, game, now);
      this.drawBonus(ctx, game, now);
      this.drawSnake(ctx, game, now);
      this.drawParticles(ctx, dt);
      ctx.restore();

      if (this.fx) ctx.drawImage(this.fx, 0, 0, W, H);

      if (game.status === 'over') {
        ctx.fillStyle = 'rgba(255,40,40,0.10)';
        ctx.fillRect(0, 0, W, H);
      }
    }

    drawBoard(ctx, game, W, H, now) {
      const c = this.cell, p = this.pal;
      ctx.fillStyle = p.board;
      ctx.fillRect(0, 0, W, H);

      if (this.style === 'neon') {
        const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
        g.addColorStop(0, '#111845');
        g.addColorStop(1, p.board);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = p.boardAlt;
      for (let y = 0; y < game.rows; y++) {
        for (let x = (y % 2); x < game.cols; x += 2) ctx.fillRect(x * c, y * c, c, c);
      }

      if (this.showGrid) {
        ctx.strokeStyle = p.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 1; x < game.cols; x++) { ctx.moveTo(x * c + 0.5, 0); ctx.lineTo(x * c + 0.5, H); }
        for (let y = 1; y < game.rows; y++) { ctx.moveTo(0, y * c + 0.5); ctx.lineTo(W, y * c + 0.5); }
        ctx.stroke();
      }

      // border: solid wall when not wrapping, dashed hint when wrapping
      ctx.save();
      ctx.lineWidth = game.world.wrap ? 2 : 4;
      ctx.strokeStyle = this.style === 'neon' ? '#00f5ff' : (this.style === 'lcd' ? p.head : p.obstacle);
      if (game.world.wrap) ctx.setLineDash([c * 0.4, c * 0.3]);
      if (this.pal.glow) { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12; }
      ctx.strokeRect(1, 1, W - 2, H - 2);
      ctx.restore();
    }

    drawObstacles(ctx, game, now) {
      const c = this.cell, p = this.pal, cols = game.cols;
      ctx.save();
      game.obstacles.forEach((id) => {
        const x = (id % cols) * c, y = Math.floor(id / cols) * c;
        if (this.style === 'lcd') {
          ctx.fillStyle = p.obstacle;
          ctx.fillRect(x + 1, y + 1, c - 2, c - 2);
          ctx.fillStyle = p.board;
          ctx.fillRect(x + c * 0.3, y + c * 0.3, c * 0.4, c * 0.4);
        } else if (this.style === 'maze') {
          ctx.fillStyle = p.obstacle;
          ctx.fillRect(x, y, c, c);
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(x, y, c, Math.max(2, c * 0.12));
          ctx.fillRect(x, y, Math.max(2, c * 0.12), c);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(x, y + c - Math.max(2, c * 0.12), c, Math.max(2, c * 0.12));
          ctx.fillRect(x + c - Math.max(2, c * 0.12), y, Math.max(2, c * 0.12), c);
        } else if (this.style === 'neon') {
          const pulse = 0.6 + 0.4 * Math.sin(now / 260 + id);
          ctx.shadowColor = p.obstacle;
          ctx.shadowBlur = 8 + 8 * pulse;
          ctx.strokeStyle = p.obstacle;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, c - 6, c - 6);
          ctx.fillStyle = 'rgba(255,43,214,0.25)';
          ctx.fillRect(x + 3, y + 3, c - 6, c - 6);
        } else {
          ctx.fillStyle = p.obstacle;
          roundRect(ctx, x + 1, y + 1, c - 2, c - 2, c * 0.2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    drawFood(ctx, game, now) {
      const f = game.food;
      if (!f) return;
      const c = this.cell, p = this.pal;
      const cx = (f.x + 0.5) * c, cy = (f.y + 0.5) * c;
      ctx.save();
      if (this.style === 'lcd') {
        const s = c * 0.26;
        ctx.fillStyle = p.food;
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
          ctx.fillRect(cx + d[0] * s - s / 2, cy + d[1] * s - s / 2, s, s);
        });
      } else {
        const pulse = 1 + 0.09 * Math.sin(now / 170);
        const r = c * 0.34 * pulse;
        if (p.glow) { ctx.shadowColor = p.food; ctx.shadowBlur = 16; }
        const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, p.food);
        g.addColorStop(1, mix(p.food.length === 7 ? p.food : '#ff5d5d', '#000000', 0.35));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawBonus(ctx, game, now) {
      const b = game.bonus;
      if (!b) return;
      const c = this.cell, p = this.pal;
      const cx = (b.x + 0.5) * c, cy = (b.y + 0.5) * c;
      const frac = b.ttl / b.max;
      // blink during the last third
      if (frac < 0.33 && Math.floor(now / 140) % 2 === 0) return;
      ctx.save();
      const pulse = 1 + 0.12 * Math.sin(now / 120);
      if (p.glow || this.style !== 'lcd') { ctx.shadowColor = p.bonus; ctx.shadowBlur = 12; }
      ctx.fillStyle = p.bonus;
      star(ctx, cx, cy, c * 0.46 * pulse, c * 0.2 * pulse);
      ctx.fill();
      // timer ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = p.bonus;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, c * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
      ctx.restore();
    }

    drawSnake(ctx, game, now) {
      const c = this.cell, p = this.pal, snake = game.snake, n = snake.length;
      const dead = game.status === 'over';
      ctx.save();
      for (let i = n - 1; i >= 0; i--) {
        const s = snake[i];
        const t = n === 1 ? 0 : i / (n - 1);
        let color = this.style === 'lcd' ? mix(p.head, p.tail, t) : mix(p.head, p.tail, t);
        if (dead) color = mix('#ff4d4d', '#552222', t);
        const x = s.x * c, y = s.y * c;
        if (p.glow && !dead) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
        ctx.fillStyle = color;
        if (this.style === 'lcd') {
          ctx.fillRect(x + 1, y + 1, c - 2, c - 2);
        } else {
          roundRect(ctx, x + c * 0.06, y + c * 0.06, c * 0.88, c * 0.88, c * (i === 0 ? 0.36 : 0.28));
          ctx.fill();
          if (i > 0 && !dead) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            roundRect(ctx, x + c * 0.18, y + c * 0.14, c * 0.64, c * 0.26, c * 0.12);
            ctx.fill();
          }
        }
      }
      ctx.shadowBlur = 0;
      this.drawEyes(ctx, game, dead);
      ctx.restore();
    }

    drawEyes(ctx, game, dead) {
      const c = this.cell, h = game.head, d = DIRS[game.dir];
      const cx = (h.x + 0.5) * c, cy = (h.y + 0.5) * c;
      const px = -d.y, py = d.x; // perpendicular
      const fwd = c * 0.14, side = c * 0.2;
      for (let s = -1; s <= 1; s += 2) {
        const ex = cx + d.x * fwd + px * side * s;
        const ey = cy + d.y * fwd + py * side * s;
        if (this.style === 'lcd') {
          ctx.fillStyle = this.pal.board;
          const k = Math.max(2, c * 0.16);
          ctx.fillRect(ex - k / 2, ey - k / 2, k, k);
        } else if (dead) {
          ctx.strokeStyle = '#220000';
          ctx.lineWidth = Math.max(1.5, c * 0.07);
          const k = c * 0.07;
          ctx.beginPath();
          ctx.moveTo(ex - k, ey - k); ctx.lineTo(ex + k, ey + k);
          ctx.moveTo(ex + k, ey - k); ctx.lineTo(ex - k, ey + k);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(ex, ey, c * 0.12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#10141f';
          ctx.beginPath(); ctx.arc(ex + d.x * c * 0.04, ey + d.y * c * 0.04, c * 0.06, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    drawParticles(ctx, dt) {
      const list = this.particles;
      for (let i = list.length - 1; i >= 0; i--) {
        const q = list[i];
        q.life += dt;
        if (q.life >= q.max) { list.splice(i, 1); continue; }
        q.x += q.vx * (dt / 16);
        q.y += q.vy * (dt / 16);
        q.vy += 0.002 * dt * (this.cell / 20);
        const a = 1 - q.life / q.max;
        ctx.globalAlpha = a;
        ctx.fillStyle = q.color;
        if (this.style === 'lcd') ctx.fillRect(q.x, q.y, q.size, q.size);
        else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
  }

  SP.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
