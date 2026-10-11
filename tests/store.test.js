const test = require('node:test');
const assert = require('node:assert/strict');
const SP = require('./helpers');

const fake = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, _m: m }; };

test('fresh store has defaults and only world 1 unlocked', () => {
  const s = SP.createStore(fake());
  assert.equal(s.get().profile.name, 'PLAYER');
  assert.ok(s.isUnlocked(SP.WORLDS, SP.WORLDS[0].id));
  assert.ok(!s.isUnlocked(SP.WORLDS, SP.WORLDS[1].id));
});

test('progress persists and unlocks the next world', () => {
  const storage = fake();
  const a = SP.createStore(storage);
  a.update((d) => { d.completed[SP.WORLDS[0].id] = true; d.best['x'] = 99; });
  const b = SP.createStore(storage);
  assert.equal(b.get().best.x, 99);
  assert.ok(b.isUnlocked(SP.WORLDS, SP.WORLDS[1].id));
});

test('corrupt save data falls back to defaults instead of crashing', () => {
  const storage = fake();
  storage.setItem('snake-play-nokia:save:v2', '{not json');
  const s = SP.createStore(storage);
  assert.equal(s.get().stats.games, 0);
});

test('missing or throwing storage keeps working in memory', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const s = SP.createStore(broken);
  s.update((d) => { d.stats.games = 5; });
  assert.equal(s.get().stats.games, 5);
  assert.ok(s.isMemoryOnly());
  assert.equal(SP.createStore(null).get().stats.games, 0);
});

test('reset restores defaults', () => {
  const s = SP.createStore(fake());
  s.update((d) => { d.stats.games = 9; });
  s.reset();
  assert.equal(s.get().stats.games, 0);
});
