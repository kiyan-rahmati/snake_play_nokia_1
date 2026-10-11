/**
 * ui.js — DOM helpers and views. No game logic here.
 * Text is always inserted with textContent (never innerHTML), so player names can't inject markup.
 */
(function (global) {
  'use strict';
  const SP = (global.SP = global.SP || {});
  const doc = global.document;

  function $(sel, root) { return (root || doc).querySelector(sel); }

  function el(tag, props, kids) {
    const node = doc.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      const v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'style') node.setAttribute('style', v);
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return node;
  }

  /* ---------------- screens & navigation ---------------- */
  function showScreen(name) {
    doc.querySelectorAll('[data-screen]').forEach(function (s) {
      s.hidden = s.getAttribute('data-screen') !== name;
    });
    doc.querySelectorAll('[data-nav]').forEach(function (a) {
      const active = a.getAttribute('data-nav') === (name === 'game' ? 'home' : name);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    global.scrollTo(0, 0);
  }

  /* ---------------- toasts ---------------- */
  function toast(title, icon, sub) {
    const box = $('#toasts');
    if (!box) return;
    const t = el('div', { class: 'toast', role: 'status' }, [
      el('span', { class: 'toast__icon', text: icon || '✨', 'aria-hidden': 'true' }),
      el('div', {}, [el('strong', { text: title }), sub ? el('small', { text: sub }) : null]),
    ]);
    box.appendChild(t);
    setTimeout(function () { t.classList.add('is-leaving'); }, 2800);
    setTimeout(function () { t.remove(); }, 3200);
  }

  /* ---------------- world cards ---------------- */
  function worldColors(w) {
    const p = w.palette;
    return w.style === 'lcd' ? [p.board, '#6f8a4a'] : [p.head, p.tail];
  }

  function renderWorlds(grid, opts) {
    grid.textContent = '';
    opts.worlds.forEach(function (w, i) {
      const unlocked = opts.isUnlocked(w.id);
      const done = !!opts.data.completed[w.id];
      const best = opts.data.best[w.id] || 0;
      const c = worldColors(w);
      const prev = opts.worlds[i - 1];

      const chips = [];
      if (!unlocked) chips.push(el('span', { class: 'chip', text: '🔒 Clear ' + prev.name }));
      else {
        if (done) chips.push(el('span', { class: 'chip chip--ok', text: '✓ Cleared' }));
        chips.push(el('span', { class: 'chip', text: 'Best ' + best }));
        chips.push(el('span', { class: 'chip', text: 'Goal ' + w.targetScore }));
      }
      chips.push(el('span', { class: 'chip', text: w.wrap ? 'Wrap-around' : 'Solid walls' }));
      if (w.layout) chips.push(el('span', { class: 'chip', text: 'Maze' }));
      if (w.growObstacles) chips.push(el('span', { class: 'chip', text: 'Growing barriers' }));
      if (w.bonus) chips.push(el('span', { class: 'chip', text: '★ Bonus' }));

      const card = el('button', {
        class: 'world-card', type: 'button',
        style: '--c1:' + c[0] + ';--c2:' + c[1],
        'aria-disabled': unlocked ? null : 'true',
        'aria-label': w.name + (unlocked ? '' : ' (locked)'),
        onclick: function () { opts.onPick(w.id, unlocked); },
      }, [
        el('div', { class: 'world-card__top' }, [
          el('span', { class: 'world-card__icon', text: w.icon, 'aria-hidden': 'true' }),
          el('span', { class: 'world-card__num', text: 'WORLD ' + w.order }),
        ]),
        el('h3', { text: w.name }),
        el('p', { text: w.subtitle + ' — ' + w.description }),
        el('div', { class: 'world-card__meta' }, chips),
      ]);
      grid.appendChild(card);
    });
  }

  /* ---------------- achievements ---------------- */
  function renderAchievements(grid, summary, ctx, unlocked, list) {
    grid.textContent = '';
    const doneCount = list.filter(function (a) { return unlocked[a.id]; }).length;
    summary.textContent = doneCount + ' of ' + list.length + ' unlocked';
    list.forEach(function (a) {
      const done = !!unlocked[a.id];
      const p = a.progress(ctx);
      const cur = Math.min(p[0], p[1]);
      const pct = Math.round((cur / p[1]) * 100);
      const bar = el('div', { class: 'bar', 'aria-hidden': 'true' }, [el('i', { style: 'width:' + pct + '%' })]);
      grid.appendChild(el('article', { class: 'ach' + (done ? ' is-done' : '') }, [
        el('div', { class: 'ach__icon', text: a.icon, 'aria-hidden': 'true' }),
        el('div', {}, [
          el('h3', { text: a.title }),
          el('p', { text: a.text }),
          bar,
          el('small', { text: done ? 'Unlocked ✓' : cur + ' / ' + p[1] }),
        ]),
      ]));
    });
  }

  /* ---------------- profile stats ---------------- */
  function fmtTime(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
  }

  function renderProfileStats(box, data, worldCount) {
    box.textContent = '';
    const cleared = Object.keys(data.completed).filter(function (k) { return data.completed[k]; }).length;
    [
      ['Games played', data.stats.games],
      ['Food eaten', data.stats.food],
      ['Bonus stars', data.stats.bonus],
      ['Total score', data.stats.totalScore],
      ['Longest snake', data.stats.longest],
      ['Play time', fmtTime(data.stats.playSeconds)],
      ['Worlds cleared', cleared + ' / ' + worldCount],
    ].forEach(function (row) {
      box.appendChild(el('div', {}, [el('span', { text: row[0] }), el('b', { text: String(row[1]) })]));
    });
  }

  /* ---------------- game overlay ---------------- */
  function setOverlay(cfg) {
    const ov = $('#overlay');
    $('#ov-icon').textContent = cfg.icon || '';
    $('#ov-title').textContent = cfg.title || '';
    $('#ov-text').textContent = cfg.text || '';
    const box = $('#ov-actions');
    box.textContent = '';
    let primary = null;
    (cfg.actions || []).forEach(function (a) {
      const b = el('button', { class: 'btn' + (a.primary ? ' btn--primary' : ''), type: 'button', text: a.label, onclick: a.onClick });
      if (a.primary) primary = b;
      box.appendChild(b);
    });
    ov.hidden = false;
    if (primary) primary.focus({ preventScroll: true });
    return primary;
  }
  function hideOverlay() { $('#overlay').hidden = true; }
  function isOverlayVisible() { return !$('#overlay').hidden; }

  function showCountdown(text) {
    const c = $('#countdown');
    if (text === null) { c.hidden = true; c.textContent = ''; return; }
    c.hidden = false;
    c.textContent = '';
    c.appendChild(el('b', { text: String(text) }));
  }

  SP.ui = {
    $: $, el: el, showScreen: showScreen, toast: toast,
    renderWorlds: renderWorlds, renderAchievements: renderAchievements, renderProfileStats: renderProfileStats,
    setOverlay: setOverlay, hideOverlay: hideOverlay, isOverlayVisible: isOverlayVisible, showCountdown: showCountdown,
  };
})(typeof window !== 'undefined' ? window : globalThis);
