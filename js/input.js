/**
 * input.js — keyboard, swipe and on-screen D-pad.
 * Emits through callbacks; knows nothing about the game itself.
 */
(function (global) {
  'use strict';
  const SP = (global.SP = global.SP || {});

  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };

  function createInput(handlers) {
    let enabled = false;
    let touchStart = null;

    function typing(e) {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    }

    function onKey(e) {
      if (!enabled || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (KEYS[e.key]) {
        e.preventDefault();
        handlers.onDirection(KEYS[e.key]);
      } else if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        // A focused button handles Space itself (click); don't steal it.
        if (e.key === ' ' && e.target && e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        if (!e.repeat) handlers.onPause();
      } else if (e.key === 'Enter') {
        if (!e.repeat && !(e.target && e.target.tagName === 'BUTTON')) handlers.onPrimary();
      }
    }

    function onTouchStart(e) {
      if (!enabled || !e.touches.length) return;
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    function onTouchMove(e) {
      if (!enabled) return;
      e.preventDefault(); // keep the page from scrolling while swiping on the board
      if (!touchStart || !e.touches.length) return;
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      handlers.onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; // allow chained swipes
    }
    function onTouchEnd() { touchStart = null; }

    function onDpad(e) {
      if (!enabled) return;
      const btn = e.target.closest('[data-dir]');
      if (!btn) return;
      e.preventDefault();
      handlers.onDirection(btn.getAttribute('data-dir'));
    }

    return {
      attach: function (board, dpad) {
        global.addEventListener('keydown', onKey);
        board.addEventListener('touchstart', onTouchStart, { passive: true });
        board.addEventListener('touchmove', onTouchMove, { passive: false });
        board.addEventListener('touchend', onTouchEnd);
        board.addEventListener('touchcancel', onTouchEnd);
        if (dpad) dpad.addEventListener('pointerdown', onDpad);
      },
      setEnabled: function (v) { enabled = !!v; },
    };
  }

  SP.createInput = createInput;
})(typeof window !== 'undefined' ? window : globalThis);
