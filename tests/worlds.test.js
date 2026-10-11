const test = require('node:test');
const assert = require('node:assert/strict');
const SP = require('./helpers');

function connected(world, game) {
  // BFS over free cells (respecting wrap) — every free cell must be reachable.
  const free = [];
  for (let y = 0; y < world.rows; y++) for (let x = 0; x < world.cols; x++) if (!game.hasObstacle(x, y)) free.push([x, y]);
  const seen = new Set([game.idx(4, Math.floor(world.rows / 2))]);
  const q = [[4, Math.floor(world.rows / 2)]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const d of Object.values(SP.CONST.DIRS)) {
      let nx = x + d.x, ny = y + d.y;
      if (world.wrap) { nx = (nx + world.cols) % world.cols; ny = (ny + world.rows) % world.rows; }
      else if (!game.inBounds(nx, ny)) continue;
      if (game.hasObstacle(nx, ny) || seen.has(game.idx(nx, ny))) continue;
      seen.add(game.idx(nx, ny));
      q.push([nx, ny]);
    }
  }
  return { reachable: seen.size, total: free.length };
}

test('there are five unique worlds in order', () => {
  assert.equal(SP.WORLDS.length, 5);
  assert.equal(new Set(SP.WORLDS.map((w) => w.id)).size, 5);
  SP.WORLDS.forEach((w, i) => assert.equal(w.order, i + 1));
});

test('worlds have valid data', () => {
  for (const w of SP.WORLDS) {
    assert.ok(w.cols >= 10 && w.rows >= 10, w.id);
    assert.ok(w.speed.start < w.speed.max, w.id);
    assert.ok(w.targetScore > 0, w.id);
    for (const k of ['page', 'board', 'boardAlt', 'grid', 'head', 'tail', 'food', 'bonus', 'obstacle']) {
      assert.ok(w.palette[k], `${w.id} palette.${k}`);
    }
    if (w.layout) {
      assert.equal(w.layout.length, w.rows, w.id);
      w.layout.forEach((r) => assert.equal(r.length, w.cols, w.id));
    }
  }
});

test('start area is clear and every free cell is reachable in every world', () => {
  for (const w of SP.WORLDS) {
    const g = new SP.Game(w);
    const mid = Math.floor(w.rows / 2);
    for (let y = mid - 2; y <= mid + 2; y++) for (let x = 0; x <= 7; x++) {
      assert.ok(!g.hasObstacle(x, y), `${w.id}: obstacle in start area (${x},${y})`);
    }
    const { reachable, total } = connected(w, g);
    assert.equal(reachable, total, `${w.id}: some free cells are unreachable`);
  }
});

test('each world can be reached by playing: target score is attainable', () => {
  for (const w of SP.WORLDS) {
    const foodNeeded = Math.ceil(w.targetScore / w.foodPoints);
    assert.ok(foodNeeded * 1 < w.cols * w.rows / 3, `${w.id} target needs too many food items`);
  }
});
