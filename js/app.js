/**
 * app.js — wires modules together: routing, game loop, HUD, progress, settings.
 */
(function (global) {
  'use strict';
  const SP = global.SP;
  const ui = SP.ui;
  const store = SP.store;
  const audio = SP.audio;
  const WORLDS = SP.WORLDS;
  const $ = ui.$;
  const doc = global.document;

  const board = $('#board');
  const renderer = new SP.Renderer(board);

  let world = null;
  let game = null;
  let rafId = 0;
  let lastTs = 0;
  let acc = 0;
  let counting = false;      // 3-2-1 countdown in progress
  let countTimer = 0;
  let overTimer = 0;
  let runSeconds = 0;
  let runRecorded = false;
  let primaryAction = null;

  /* ====================================================== settings */
  function applySettings() {
    const s = store.get().settings;
    doc.documentElement.setAttribute('data-theme', s.theme === 'day' ? 'day' : 'night');
    const meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', s.theme === 'day' ? '#eef2e1' : '#10140d');
    $('#theme-toggle').textContent = s.theme === 'day' ? '☾' : '☀';
    audio.setEnabled(s.sound);
    renderer.showGrid = s.grid;
  }

  function vibrate(pattern) {
    if (store.get().settings.vibration && global.navigator && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
    }
  }

  /* ====================================================== progress */
  function achievementContext(run) {
    const d = store.get();
    return { stats: d.stats, completed: d.completed, best: d.best, run: run || null };
  }

  function checkAchievements(run) {
    const fresh = SP.achievements.evaluate(achievementContext(run), store.get().achievements);
    if (!fresh.length) return;
    store.update(function (d) { fresh.forEach(function (a) { d.achievements[a.id] = Date.now(); }); });
    audio.play('achievement');
    fresh.forEach(function (a, i) {
      setTimeout(function () { ui.toast('Achievement: ' + a.title, a.icon, a.text); }, i * 600);
    });
  }

  /** Save the finished (or abandoned) run exactly once. */
  function recordRun() {
    if (runRecorded || !game || game.ticks === 0) return;
    runRecorded = true;
    const run = { score: game.score, length: game.length, seconds: runSeconds };
    store.update(function (d) {
      d.stats.games += 1;
      d.stats.food += game.eaten;
      d.stats.bonus += game.bonusEaten;
      d.stats.totalScore += game.score;
      d.stats.longest = Math.max(d.stats.longest, game.length);
      d.stats.playSeconds += Math.round(runSeconds);
      d.best[world.id] = Math.max(d.best[world.id] || 0, game.score);
    });
    checkAchievements(run);
  }

  function nextWorld() {
    const i = WORLDS.indexOf(world);
    return i >= 0 && i < WORLDS.length - 1 ? WORLDS[i + 1] : null;
  }

  /* ====================================================== game screen */
  function openWorld(id) {
    const w = SP.getWorld(id);
    if (!w) { global.location.hash = '#/home'; return; }
    if (!store.isUnlocked(WORLDS, id)) {
      ui.toast('World locked', '🔒', 'Clear the previous world first.');
      global.location.hash = '#/home';
      return;
    }
    leaveGame();
    world = w;
    game = new SP.Game(world);
    ui.showScreen('game');
    $('[data-screen="game"]').style.setProperty('--world-page', world.palette.page);
    $('#hud-icon').textContent = world.icon;
    $('#hud-world').textContent = world.name;
    renderer.setWorld(world);
    input.setEnabled(true);
    resetRunState();
    updateHud();
    showReady();
    startLoop();
  }

  function resetRunState() {
    clearTimeout(countTimer);
    clearTimeout(overTimer);
    counting = false;
    runSeconds = 0;
    runRecorded = false;
    acc = 0;
    ui.showCountdown(null);
  }

  function leaveGame() {
    if (!game) return;
    input.setEnabled(false);
    recordRun();
    stopLoop();
    resetRunState();
    ui.hideOverlay();
    game = null;
    world = null;
  }

  function updateHud() {
    if (!game) return;
    $('#hud-score').textContent = game.score;
    $('#hud-best').textContent = Math.max(game.score, store.get().best[world.id] || 0);
    $('#hud-length').textContent = game.length;
    $('#hud-speed').textContent = game.speedLevel();
    const pct = Math.min(100, Math.round((game.score / world.targetScore) * 100));
    const next = nextWorld();
    $('#goal-fill').style.width = pct + '%';
    $('#goal').setAttribute('aria-valuenow', String(pct));
    $('#goal-label').textContent = game.cleared
      ? 'World cleared · endless mode'
      : game.score + ' / ' + world.targetScore + (next ? ' to unlock ' + next.name : ' to become a legend');
  }

  /* ---------- overlays ---------- */
  function showReady() {
    primaryAction = startRun;
    ui.setOverlay({
      icon: world.icon, title: world.name,
      text: world.subtitle + '\nReach ' + world.targetScore + ' points to clear this world.',
      actions: [
        { label: '▶ Start', primary: true, onClick: startRun },
        { label: 'Back to worlds', onClick: function () { global.location.hash = '#/home'; } },
      ],
    });
  }

  function showPaused() {
    primaryAction = resumeRun;
    ui.setOverlay({
      icon: '❚❚', title: 'Paused', text: 'Take a breath.',
      actions: [
        { label: '▶ Resume', primary: true, onClick: resumeRun },
        { label: '↻ Restart', onClick: restartRun },
        { label: 'Back to worlds', onClick: function () { global.location.hash = '#/home'; } },
      ],
    });
  }

  function showOver() {
    const best = store.get().best[world.id] || 0;
    const reasons = { wall: 'You hit the wall.', self: 'You bit your own tail.', obstacle: 'You crashed into a barrier.' };
    primaryAction = restartRun;
    ui.setOverlay({
      icon: '💥', title: 'Game over',
      text: (reasons[game.deathReason] || '') + '\nScore ' + game.score + ' · Best ' + best,
      actions: [
        { label: '↻ Play again', primary: true, onClick: restartRun },
        { label: 'Back to worlds', onClick: function () { global.location.hash = '#/home'; } },
      ],
    });
  }

  function showWon(perfect) {
    const next = nextWorld();
    const actions = [];
    if (next) actions.push({ label: 'Next: ' + next.name + ' →', primary: true, onClick: function () { global.location.hash = '#/play/' + next.id; } });
    if (!perfect) actions.push({ label: '∞ Keep playing', primary: !next, onClick: continueRun });
    actions.push({ label: 'Back to worlds', onClick: function () { global.location.hash = '#/home'; } });
    primaryAction = actions[0].onClick;
    ui.setOverlay({
      icon: next ? '🎉' : '👑',
      title: perfect ? 'Perfect board!' : (next ? 'World cleared!' : 'You are a Nokia Legend!'),
      text: 'Score ' + game.score + (next ? '\n' + next.name + ' is now unlocked.' : '\nAll five worlds cleared.'),
      actions: actions,
    });
  }

  /* ---------- run control ---------- */
  function countdown(from, done) {
    counting = true;
    ui.hideOverlay();
    let n = from;
    (function tick() {
      if (n === 0) { ui.showCountdown(null); counting = false; done(); return; }
      ui.showCountdown(n);
      audio.play('click');
      n--;
      countTimer = setTimeout(tick, 650);
    })();
  }

  function startRun() {
    audio.unlock();
    if (!game || counting) return;
    countdown(3, function () { game.start(); acc = 0; });
  }
  function resumeRun() {
    if (!game || counting || game.status !== 'paused') return;
    countdown(2, function () { game.resume(); acc = 0; });
  }
  function continueRun() {
    if (!game || counting) return;
    game.continueAfterWin();
    updateHud();
    countdown(2, function () { acc = 0; });
  }
  function restartRun() {
    if (!game) return;
    recordRun();
    resetRunState();
    game.reset();
    updateHud();
    startRun();
  }
  function togglePause() {
    if (!game || counting) return;
    if (game.status === 'ready') startRun();
    else if (game.status === 'running') { game.pause(); showPaused(); }
    else if (game.status === 'paused') resumeRun();
  }

  /* ---------- events from the engine ---------- */
  function handleEvents(events) {
    const p = world.palette;
    events.forEach(function (e) {
      if (e.type === 'eat') {
        renderer.burst(e.x, e.y, p.food, 10);
        audio.play('eat');
        vibrate(12);
      } else if (e.type === 'bonus') {
        renderer.burst(e.x, e.y, p.bonus, 20);
        audio.play('bonus');
        vibrate([20, 30, 20]);
      } else if (e.type === 'obstacle') {
        renderer.burst(e.x, e.y, p.obstacle, 8);
        audio.play('click');
      } else if (e.type === 'die') {
        audio.play('die');
        vibrate([90, 40, 90]);
        renderer.shake(420);
        recordRun();
        overTimer = setTimeout(function () { if (game && game.status === 'over') showOver(); updateHud(); }, 700);
      } else if (e.type === 'win') {
        audio.play('win');
        vibrate([40, 40, 40, 40, 120]);
        store.update(function (d) { d.completed[world.id] = true; });
        checkAchievements({ score: game.score, length: game.length, seconds: runSeconds });
        setTimeout(function () { if (game && game.status === 'won') showWon(e.perfect); }, 450);
      }
    });
  }

  /* ---------- main loop ---------- */
  function frame(ts) {
    rafId = global.requestAnimationFrame(frame);
    if (!game) return;
    const dt = Math.min(100, lastTs ? ts - lastTs : 16);
    lastTs = ts;

    if (game.status === 'running' && !counting) {
      runSeconds += dt / 1000;
      acc += dt;
      const interval = 1000 / game.tps();
      let steps = 0;
      while (acc >= interval && game.status === 'running' && steps < 4) {
        acc -= interval;
        steps++;
        handleEvents(game.step());
      }
      if (steps) updateHud();
      if (acc > interval * 4) acc = 0;
    }
    renderer.render(game, ts);
  }
  function startLoop() { stopLoop(); lastTs = 0; rafId = global.requestAnimationFrame(frame); }
  function stopLoop() { if (rafId) global.cancelAnimationFrame(rafId); rafId = 0; }

  /* ====================================================== other screens */
  function suggestedWorld() {
    const d = store.get();
    for (let i = 0; i < WORLDS.length; i++) {
      if (store.isUnlocked(WORLDS, WORLDS[i].id) && !d.completed[WORLDS[i].id]) return WORLDS[i];
    }
    return WORLDS[WORLDS.length - 1];
  }

  function renderHome() {
    const d = store.get();
    const bestAll = Object.keys(d.best).reduce(function (m, k) { return Math.max(m, d.best[k]); }, 0);
    $('#home-best').textContent = bestAll;
    $('#home-games').textContent = d.stats.games;
    $('#home-ach').textContent = Object.keys(d.achievements).length + ' / ' + SP.achievements.LIST.length;
    const eyebrow = $('.eyebrow');
    eyebrow.textContent = d.stats.games > 0 ? 'WELCOME BACK, ' + d.profile.avatar + ' ' + d.profile.name : 'THE LEGEND IS BACK';
    $('#btn-play').textContent = d.stats.games > 0 ? '▶ Continue: ' + suggestedWorld().name : '▶ Play';
    ui.renderWorlds($('#world-grid'), {
      worlds: WORLDS, data: d,
      isUnlocked: function (id) { return store.isUnlocked(WORLDS, id); },
      onPick: function (id, unlocked) {
        if (!unlocked) { ui.toast('World locked', '🔒', 'Clear the previous world first.'); return; }
        global.location.hash = '#/play/' + id;
      },
    });
  }

  function renderAchievementsPage() {
    ui.renderAchievements($('#ach-grid'), $('#ach-summary'), achievementContext(null),
      store.get().achievements, SP.achievements.LIST);
  }

  function renderSettings() {
    const d = store.get();
    $('#set-name').value = d.profile.name;
    $('#set-avatar').value = d.profile.avatar;
    $('#set-sound').checked = d.settings.sound;
    $('#set-grid').checked = d.settings.grid;
    $('#set-vibration').checked = d.settings.vibration;
    ui.renderProfileStats($('#profile-stats'), d, WORLDS.length);
  }

  /* ====================================================== router */
  function route() {
    const hash = global.location.hash.replace(/^#\/?/, '');
    const parts = hash.split('/');
    const page = parts[0] || 'home';

    if (page !== 'play') leaveGame();

    if (page === 'play') openWorld(parts[1]);
    else if (page === 'achievements') { renderAchievementsPage(); ui.showScreen('achievements'); }
    else if (page === 'settings') { renderSettings(); ui.showScreen('settings'); }
    else { renderHome(); ui.showScreen('home'); }

    ui.$('#main').focus({ preventScroll: true });
  }

  /* ====================================================== wiring */
  const input = SP.createInput({
    onDirection: function (dir) {
      if (!game) return;
      if (game.setDirection(dir)) audio.unlock();
    },
    onPause: togglePause,
    onPrimary: function () { if (ui.isOverlayVisible() && primaryAction) primaryAction(); },
  });
  input.attach(board, $('#dpad'));

  function bind() {
    $('#btn-play').addEventListener('click', function () { global.location.hash = '#/play/' + suggestedWorld().id; });
    $('#btn-pause').addEventListener('click', togglePause);
    $('#btn-restart').addEventListener('click', function () { if (!counting) restartRun(); });
    $('#btn-exit').addEventListener('click', function () { global.location.hash = '#/home'; });

    $('#theme-toggle').addEventListener('click', function () {
      store.update(function (d) { d.settings.theme = d.settings.theme === 'day' ? 'night' : 'day'; });
      applySettings();
      audio.play('click');
    });

    $('#set-name').addEventListener('input', function (e) {
      const v = e.target.value.replace(/\s+/g, ' ').slice(0, 14);
      store.update(function (d) { d.profile.name = v.trim() || 'PLAYER'; });
    });
    $('#set-name').addEventListener('blur', function (e) { e.target.value = store.get().profile.name; });
    $('#set-avatar').addEventListener('change', function (e) {
      store.update(function (d) { d.profile.avatar = e.target.value; });
    });
    [['sound', '#set-sound'], ['grid', '#set-grid'], ['vibration', '#set-vibration']].forEach(function (pair) {
      $(pair[1]).addEventListener('change', function (e) {
        store.update(function (d) { d.settings[pair[0]] = e.target.checked; });
        applySettings();
        if (pair[0] === 'sound' && e.target.checked) audio.play('click');
      });
    });
    $('#btn-reset').addEventListener('click', function () {
      if (global.confirm('Delete all progress on this device? This cannot be undone.')) {
        store.reset();
        applySettings();
        renderSettings();
        ui.toast('Progress reset', '🧹');
      }
    });

    global.addEventListener('hashchange', route);
    global.addEventListener('resize', function () { renderer.resize(); });
    global.addEventListener('orientationchange', function () { setTimeout(function () { renderer.resize(); }, 250); });
    global.addEventListener('pagehide', recordRun);
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden && game && game.status === 'running' && !counting) { game.pause(); showPaused(); }
    });
    doc.addEventListener('pointerdown', function () { audio.unlock(); }, { once: true });
  }

  function init() {
    applySettings();
    bind();
    route();
    if (store.isMemoryOnly()) ui.toast('Saving is blocked', '⚠️', 'Progress will be lost when you close the tab.');
    if ('serviceWorker' in navigator && /^https?:$/.test(global.location.protocol)) {
      navigator.serviceWorker.register('./service-worker.js').catch(function () { /* offline mode is optional */ });
    }
  }

  init();
})(window);
