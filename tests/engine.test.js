const test = require('node:test');
const assert = require('node:assert/strict');
const SP = require('./helpers');

const plain = {
  id: 't', cols: 10, rows: 8, wrap: false, layout: null, growObstacles: null, bonus: null,
  speed: { start: 5, max: 10, step: 1, every: 2 }, foodPoints: 10, targetScore: 50,
};
const make = (over, rng) => {
  const g = new SP.Game(Object.assign({}, plain, over || {}), { rng: rng || (() => 0.5) });
  g.start();
  return g;
};

test('snake moves one cell per step', () => {
  const g = make();
  const h = { ...g.head };
  g.step();
  assert.deepEqual(g.head, { x: h.x + 1, y: h.y });
  assert.equal(g.length, 3);
});

test('cannot reverse or repeat a direction', () => {
  const g = make();
  assert.equal(g.setDirection('left'), false);
  assert.equal(g.setDirection('right'), false);
  assert.equal(g.setDirection('up'), true);
  assert.equal(g.setDirection('down'), false); // opposite of queued 'up'
});

test('two quick turns are buffered and applied one per tick', () => {
  const g = make();
  g.setDirection('up');
  g.setDirection('left');
  g.step(); assert.equal(g.dir, 'up');
  g.step(); assert.equal(g.dir, 'left');
});

test('eating food grows the snake and scores', () => {
  const g = make();
  g.food = { x: g.head.x + 1, y: g.head.y };
  const ev = g.step();
  assert.equal(g.length, 4);
  assert.equal(g.score, 10);
  assert.equal(g.eaten, 1);
  assert.ok(ev.some((e) => e.type === 'eat'));
  assert.ok(g.food && !g.snake.some((s) => s.x === g.food.x && s.y === g.food.y));
});

test('hitting a wall ends the game when wrap is off', () => {
  const g = make();
  let ev = [];
  for (let i = 0; i < 20 && g.status === 'running'; i++) ev = g.step();
  assert.equal(g.status, 'over');
  assert.equal(g.deathReason, 'wall');
  assert.ok(ev.some((e) => e.type === 'die'));
});

test('wrap-around keeps the snake alive', () => {
  const g = make({ wrap: true });
  for (let i = 0; i < 25; i++) g.step();
  assert.equal(g.status, 'running');
  assert.ok(g.head.x >= 0 && g.head.x < 10);
});

test('running into itself ends the game', () => {
  const g = make({ cols: 12, rows: 12 });
  g.snake = [{x:5,y:5},{x:5,y:6},{x:6,y:6},{x:6,y:5},{x:6,y:4},{x:5,y:4},{x:4,y:4}];
  g.dir = 'up';
  g.food = { x: 0, y: 0 };
  g.setDirection('right'); // head (5,5) -> (6,5) is body
  g.step();
  assert.equal(g.status, 'over');
  assert.equal(g.deathReason, 'self');
});

test('moving into the cell the tail just left is allowed', () => {
  const g = make({ cols: 12, rows: 12 });
  // 2x2 loop: head chases its own tail
  g.snake = [{x:5,y:5},{x:5,y:6},{x:6,y:6},{x:6,y:5}];
  g.dir = 'up';
  g.food = { x: 0, y: 0 };
  g.setDirection('right'); // head -> (6,5) which is the tail, and the tail moves away
  g.step();
  assert.equal(g.status, 'running');
});

test('obstacle collision ends the game', () => {
  const g = make();
  g.obstacles.add(g.idx(g.head.x + 1, g.head.y));
  g.step();
  assert.equal(g.deathReason, 'obstacle');
});

test('reaching the target score fires win once, then endless mode continues', () => {
  const g = make({ targetScore: 10 });
  g.food = { x: g.head.x + 1, y: g.head.y };
  const ev = g.step();
  assert.ok(ev.some((e) => e.type === 'win'));
  assert.equal(g.status, 'won');
  g.continueAfterWin();
  assert.equal(g.status, 'running');
  g.food = { x: g.head.x + 1, y: g.head.y };
  const ev2 = g.step();
  assert.ok(!ev2.some((e) => e.type === 'win'));
});

test('speed rises with food and is capped', () => {
  const g = make();
  assert.equal(g.tps(), 5);
  g.eaten = 4; assert.equal(g.tps(), 7);
  g.eaten = 999; assert.equal(g.tps(), 10);
});

test('bonus food appears on schedule and expires', () => {
  const g = make({ bonus: { every: 1, points: 50, ttl: 3, growth: 2 } });
  g.food = { x: g.head.x + 1, y: g.head.y };
  g.step();
  assert.ok(g.bonus, 'bonus spawned');
  g.bonus.x = 0; g.bonus.y = 0; // out of the way
  g.setDirection('up');
  const gone = [];
  for (let i = 0; i < 3; i++) gone.push(...g.step());
  assert.equal(g.bonus, null);
  assert.ok(gone.some((e) => e.type === 'bonusGone'));
});

test('eating bonus gives points and extra growth', () => {
  const g = make({ targetScore: 9999, bonus: { every: 1, points: 50, ttl: 20, growth: 3 } });
  g.bonus = { x: g.head.x + 1, y: g.head.y, ttl: 20, max: 20 };
  const before = g.length;
  g.step();
  assert.equal(g.score, 50);
  for (let i = 0; i < 4; i++) g.step();
  assert.equal(g.length, before + 3);
});

test('food and bonus never spawn on snake or walls', () => {
  const world = SP.getWorld('snake-maze');
  let n = 0;
  const g = new SP.Game(world, { rng: () => (n++ % 97) / 97 });
  for (let i = 0; i < 200; i++) {
    g.placeFood();
    assert.ok(g.food);
    assert.ok(!g.hasObstacle(g.food.x, g.food.y));
    assert.ok(!g.snake.some((s) => s.x === g.food.x && s.y === g.food.y));
  }
});

test('neon world adds barriers away from the head, but caps them', () => {
  const world = SP.getWorld('neon-overdrive');
  const g = new SP.Game(world, { rng: Math.random });
  g.start();
  for (let i = 0; i < 40; i++) {
    g.eaten = world.growObstacles.every * (i + 1) - 1;
    g.food = { x: g.head.x + 1, y: g.head.y };
    g.snake = [{ x: 4, y: 9 }, { x: 3, y: 9 }, { x: 2, y: 9 }];
    g.dir = 'right'; g.queue = [];
    g.bonus = null;
    g.step();
  }
  assert.ok(g.obstacles.size <= world.growObstacles.max);
  assert.ok(g.obstacles.size > 0);
});

test('filling the board counts as a perfect win', () => {
  const g = make({ cols: 4, rows: 1 });
  g.snake = [{x:2,y:0},{x:1,y:0},{x:0,y:0}];
  g.food = { x: 3, y: 0 };
  const ev = g.step();
  assert.ok(g.perfect);
  assert.equal(g.status, 'won');
  assert.ok(ev.some((e) => e.type === 'win' && e.perfect));
});
