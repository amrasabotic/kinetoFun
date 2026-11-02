// Run with: node games/traffic-controller/traffic.test.cjs
require('./traffic.js');
const T = globalThis.TRAFFIC;
const assert = require('assert');
const DT = 1 / 30;

// Zones: road arms, the walk button, and the junction middle.
assert.strictEqual(T.zoneAt(T.CX, 120), 'ns');
assert.strictEqual(T.zoneAt(T.CX + 90, 650), 'ns', 'a little off the road still counts');
assert.strictEqual(T.zoneAt(150, T.CY), 'ew');
assert.strictEqual(T.zoneAt(T.CX, T.CY), null);
assert.strictEqual(T.zoneAt(T.WALK_BTN.x, T.WALK_BTN.y), 'walk');
assert.strictEqual(T.zoneAt(150, 120), null);

// Lights pass through amber and all red; cars only move on green.
{
  const g = T.createRound(0, { seed: 1 });
  for (let k = 0; k < 120; k++) T.step(g, DT);
  assert(g.queues.n.length + g.queues.e.length > 0, 'cars arrive');
  assert.strictEqual(g.crossing.length, 0, 'nobody moves on red');
  T.request(g, 'ns');
  T.step(g, DT);
  assert.strictEqual(g.light, 'clear');
  for (let k = 0; k < 30; k++) T.step(g, DT);
  assert.strictEqual(g.light, 'ns');
  for (let k = 0; k < 90; k++) T.step(g, DT);
  assert(g.crossing.every((c) => T.AXIS[c.dir] === 'ns'));
  T.request(g, 'ew');
  T.step(g, DT);
  assert.strictEqual(g.light, 'amber');
  assert(!T.request(g, 'walk'), 'walk with nobody waiting does nothing');
}

// A controller at human pace: looks every 0.5 s, the hand takes `move` seconds to reach a road, and switches
// when the red side is clearly busier, an ambulance waits, or pedestrians have waited a while.
function play(level, seed, { move = 0.8, look = 0.5, care = 1 } = {}) {
  const g = T.createRound(level, { seed });
  let s = seed * 7 + 1;
  const random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  let nextLook = 0, pending = null, at = 0;
  const load = (axis) => (axis === 'ns' ? ['n', 's'] : ['e', 'w']).reduce((n, d) => n + g.queues[d].reduce((m, c) => m + (c.kind === 'bus' ? 2 : 1) + c.wait / 6, 0), 0);
  while (!g.over) {
    T.step(g, DT);
    g.events.length = 0;
    if (pending && g.t >= at) { T.request(g, pending); pending = null; }
    if (g.t < nextLook || pending) continue;
    nextLook = g.t + look;
    if (random() > care) continue;
    const cur = g.want || g.light;
    const amb = T.DIRS.find((d) => g.queues[d][0] && g.queues[d][0].kind === 'amb');
    let pick = null;
    if (amb && cur !== T.AXIS[amb]) pick = T.AXIS[amb];
    // Anger bars show who is about to run the red light.
    const angry = T.DIRS.find((d) => g.queues[d][0] && g.queues[d][0].wait > 9 && T.AXIS[d] !== cur);
    if (amb && cur !== T.AXIS[amb]) pick = T.AXIS[amb];
    else if (angry && !(g.waiting && g.waiting.wait > 10)) pick = T.AXIS[angry];
    else if (g.waiting && g.waiting.wait > 6 && cur !== 'walk') pick = 'walk';
    else {
      const ns = load('ns'), ew = load('ew');
      if (cur !== 'ns' && ns > ew * 1.4 + 1) pick = 'ns';
      else if (cur !== 'ew' && ew > ns * 1.4 + 1) pick = 'ew';
      else if (cur === 'red' || cur === 'walk' && !g.walkers.length) pick = ns >= ew ? 'ns' : 'ew';
    }
    if (pick) { pending = pick; at = g.t + move * (0.7 + random() * 0.6); }
  }
  return T.result(g);
}

const lines = [];
for (let lv = 0; lv < T.LEVELS.length; lv++) {
  const good = [1, 2, 3].map((k) => play(lv, k * 17 + lv));
  const slow = play(lv, 50 + lv, { move: 1.4, look: 0.9, care: 0.8 });
  lines.push(`${T.LEVELS[lv].name}: passed ${good.map((r) => r.passed).join(',')} goal ${good[0].goal} strikes ${good.map((r) => r.strikes).join(',')} stars ${good.map((r) => r.stars).join(',')} | slower ${slow.passed} (${slow.stars} stars, ${slow.strikes} strikes)`);
  if (process.env.SHOW) continue;
  // The last two shifts are meant to be lost now and then.
  assert(lv >= 8 ? good.filter((r) => r.stars >= 1).length >= 2 : good.every((r) => r.stars >= 1), `level ${lv + 1}: a steady controller should pass`);
  assert(lv < 4 || good.some((r) => r.stars < 3), `level ${lv + 1}: three stars should take effort`);
  assert(lv > 3 || slow.stars >= 1, `level ${lv + 1}: a slower controller should pass the early levels`);
}
console.log(lines.join('\n'));

// Never touching the lights, or flipping them at random, fails.
for (const lv of [0, 4]) {
  const idle = T.createRound(lv, { seed: 3 });
  while (!idle.over) T.step(idle, DT);
  assert.strictEqual(T.result(idle).stars, 0, 'doing nothing should fail');
  const g = T.createRound(lv, { seed: 4 });
  let s = 11;
  const random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  while (!g.over) { T.step(g, DT); if (random() < DT / 4) T.request(g, ['ns', 'ew', 'walk'][Math.floor(random() * 3)]); }
  const r = T.result(g);
  console.log(`random switching on ${T.LEVELS[lv].name}: ${r.passed} passed, ${r.strikes} strikes`);
  assert.strictEqual(r.stars, 0, 'random switching should fail');
}
console.log('all traffic tests passed');
