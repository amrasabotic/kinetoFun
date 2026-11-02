// Run with: node games/whack-a-mole-hand/wam.test.cjs
require('./wam.js');
const W = globalThis.WAM;
const assert = require('assert');
const DT = 1 / 30;

// Basic rules.
{
  const g = W.createRound(0, { seed: 1 });
  while (!g.holes.some(Boolean)) W.step(g, DT);
  const i = g.holes.findIndex(Boolean), h = W.HOLES[i];
  assert.strictEqual(W.smash(g, h.x, h.y), 'whiff', 'a mole just starting to rise cannot be hit');
  for (let k = 0; k < 10; k++) W.step(g, DT);
  assert.strictEqual(W.smash(g, h.x + 0.1, h.y - 0.05), 'hit', 'a smash near the hole counts');
  assert.strictEqual(g.score, 10);
  assert.strictEqual(W.smash(g, 0.5, 0.95), 'whiff');
}

// A player at human pace: reacts after 0.45s, the hammer travels at 1.2 board widths per second, lands a little off target.
function play(level, seed, skill = 1) {
  const g = W.createRound(level, { seed });
  let s = seed;
  const random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const hammer = { x: 0.5, y: 0.5 }, seen = new Map(), fooled = new Map();
  let target = -1, mole = null, busyUntil = 0;
  while (!g.over) {
    W.step(g, DT);
    g.events.length = 0;
    g.holes.forEach((m, i) => { if (m && !seen.has(m)) { seen.set(m, g.t); fooled.set(m, random() < 0.05); } });
    if (g.t < busyUntil) continue;
    // Pick the oldest visible mole that is not a bomb; a careful player notices bombs most of the time.
    if (target < 0 || g.holes[target] !== mole || mole.state === 'sink' || mole.state === 'bonk') {
      target = -1;
      const options = g.holes.map((m, i) => ({ m, i })).filter(({ m }) => m && (m.state === 'up' || m.state === 'rise') && g.t - seen.get(m) > 0.45 / skill && (m.kind !== 'bomb' || fooled.get(m)));
      if (options.length) { const o = options.sort((a, b) => seen.get(a.m) - seen.get(b.m))[0]; target = o.i; mole = o.m; }
      continue;
    }
    const h = W.HOLES[target];
    const d = Math.hypot(h.x - hammer.x, h.y - hammer.y), step = 1.2 * skill * DT;
    if (d > 0.04) { hammer.x += (h.x - hammer.x) * Math.min(1, step / d); hammer.y += (h.y - hammer.y) * Math.min(1, step / d); continue; }
    W.smash(g, hammer.x + (random() - 0.5) * 0.12, hammer.y + (random() - 0.5) * 0.12);
    busyUntil = g.t + 0.35;
  }
  return W.result(g);
}

const lines = [];
for (let lv = 0; lv < W.LEVELS.length; lv++) {
  const good = [1, 2, 3].map((s) => play(lv, s * 11 + lv));
  const slow = play(lv, 77, 0.7);
  lines.push(`${W.LEVELS[lv].name}: scores ${good.map((r) => r.score).join(',')} goal ${good[0].goal} stars ${good.map((r) => r.stars).join(',')} | slower player ${slow.score} (${slow.stars} stars)`);
  if (process.env.SHOW) continue;
  assert(good.every((r) => r.stars >= 1), `level ${lv + 1}: a steady player should pass`);
  assert(lv < 2 || good.some((r) => r.stars < 3), `level ${lv + 1}: three stars should take effort`);
  assert(lv > 2 || slow.stars >= 1, `level ${lv + 1}: a slower player should pass the early levels`);
}
console.log(lines.join('\n'));

// Smashing everywhere at random scores little and sets off bombs.
{
  const g = W.createRound(6, { seed: 5 });
  let s = 9;
  const random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  let k = 0;
  while (!g.over) { W.step(g, DT); if (++k % 9 === 0) W.smash(g, random(), random()); }
  const r = W.result(g);
  console.log(`random smashing: ${r.score} points, ${r.bombs} bombs`);
  assert(r.stars === 0, 'random smashing should not pass');
}
// Helmets take two hits; bombs cost a life.
{
  const g = W.createRound(4, { seed: 2 });
  g.holes[0] = { kind: 'helmet', state: 'up', t: 0, stay: 2, hp: 2 };
  assert.strictEqual(W.smash(g, W.HOLES[0].x, W.HOLES[0].y), 'clang');
  assert.strictEqual(W.smash(g, W.HOLES[0].x, W.HOLES[0].y), 'hit');
  g.holes[1] = { kind: 'bomb', state: 'up', t: 0, stay: 2, hp: 1 };
  W.smash(g, W.HOLES[1].x, W.HOLES[1].y);
  assert.strictEqual(g.lives, W.LIVES - 1);
}
console.log('all whack-a-mole tests passed');
