/**
 * audio.js — tiny synthesised sound effects (no audio files needed).
 * The AudioContext is created lazily on the first user gesture.
 */
(function (global) {
  'use strict';
  const SP = (global.SP = global.SP || {});

  let ctx = null;
  let enabled = true;

  function ensure() {
    if (!enabled) return null;
    try {
      if (!ctx) {
        const AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function tone(freq, dur, type, vol, delay, slideTo) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol || 0.05, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const sounds = {
    click: function () { tone(520, 0.05, 'square', 0.03); },
    eat: function () { tone(660, 0.06, 'square', 0.05); tone(990, 0.08, 'square', 0.05, 0.06); },
    bonus: function () {
      [660, 830, 990, 1320].forEach(function (f, i) { tone(f, 0.09, 'triangle', 0.06, i * 0.07); });
    },
    die: function () { tone(330, 0.5, 'sawtooth', 0.07, 0, 55); },
    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.16, 'square', 0.05, i * 0.12); });
    },
    achievement: function () { tone(880, 0.1, 'triangle', 0.06); tone(1175, 0.18, 'triangle', 0.06, 0.1); },
  };

  SP.audio = {
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },
    unlock: function () { ensure(); },
    play: function (name) { if (sounds[name]) sounds[name](); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
