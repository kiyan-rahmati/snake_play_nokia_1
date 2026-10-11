const test = require('node:test');
const assert = require('node:assert/strict');
const SP = require('./helpers');

const base = () => ({
  stats: { games: 0, food: 0, bonus: 0, totalScore: 0, longest: 3, playSeconds: 0 },
  completed: {}, best: {}, run: { score: 0, length: 3, seconds: 0 },
});

test('nothing unlocks on a fresh profile', () => {
  assert.equal(SP.achievements.evaluate(base(), {}).length, 0);
});

test('first game + first food unlock, and are not repeated once recorded', () => {
  const c = base(); c.stats.games = 1; c.stats.food = 1;
  const ids = SP.achievements.evaluate(c, {}).map((a) => a.id);
  assert.deepEqual(ids.sort(), ['first_food', 'first_game']);
  assert.equal(SP.achievements.evaluate(c, { first_food: 1, first_game: 1 }).length, 0);
});

test('run score and survival use the current run', () => {
  const c = base(); c.run = { score: 250, length: 9, seconds: 75 };
  const ids = SP.achievements.evaluate(c, {}).map((a) => a.id);
  assert.ok(ids.includes('score_200'));
  assert.ok(ids.includes('survivor'));
  assert.ok(!ids.includes('score_600'));
});

test('completing all worlds unlocks the legend', () => {
  const c = base();
  SP.WORLDS.forEach((w) => (c.completed[w.id] = true));
  const ids = SP.achievements.evaluate(c, {}).map((a) => a.id);
  assert.ok(ids.includes('world_1') && ids.includes('world_5'));
});

test('every achievement has a valid progress tuple', () => {
  const c = base();
  SP.achievements.LIST.forEach((a) => {
    const p = a.progress(c);
    assert.ok(Array.isArray(p) && p[1] > 0, a.id);
  });
});
