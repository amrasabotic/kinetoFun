// Run with: node games/gesture-chef/chef.test.cjs
require('./chef.js');
const C = globalThis.Chef;
const assert = require('assert');

// Rules on a fresh day.
{
  const g = C.createDay(0, { seed: 1 });
  assert(C.grab(g, 'bin:patty'));
  assert.strictEqual(C.drop(g, 'plate'), 'raw', 'raw patty must not go on the plate');
  assert.strictEqual(g.held, null, 'a refused patty goes back, it does not stick to the hand');
  C.grab(g, 'bin:patty');
  assert.strictEqual(C.drop(g, 'grill:0'), 'grill');
  C.step(g, 1); C.grab(g, 'grill:0');
  assert.strictEqual(C.drop(g, 'seat:0'), 'no-one');
  assert(g.grill[0] && g.grill[0].cook >= 1, 'a refused patty goes back on its grill with its cooking time');
  for (let k = 0; k < 7 * 60; k++) C.step(g, 1 / 60);
  assert(C.grab(g, 'grill:0'));
  assert.strictEqual(g.held.cook, 'done');
  C.drop(g, 'grill:0');
  for (let k = 0; k < 8 * 60; k++) C.step(g, 1 / 60);
  C.grab(g, 'grill:0');
  assert.strictEqual(g.held.cook, 'burnt', 'left too long it burns');
  assert.strictEqual(C.drop(g, 'trash'), 'trash');
  assert(!C.grab(g, 'bin:cheese'), 'cheese is not stocked on day 1');
  assert(C.sameBurger(['bun', 'cheese', 'patty', 'top'], ['bun', 'patty', 'cheese', 'top']));
  assert(!C.sameBurger(['top', 'patty', 'bun'], ['bun', 'patty', 'top']));
}

// A player at human pace: every grab or drop takes 1.1s of hand travel; keeps the grill busy and serves the most impatient customer.
function play(level, seed, pace = 1.1) {
  const g = C.createDay(level, { seed });
  const DT = 1 / 30;
  let busyUntil = 0, plan = [];
  const act = (fn) => { fn(); busyUntil = g.t + pace; };
  const guard = 400;
  while (!g.over && g.t < g.day.length + guard) {
    C.step(g, DT);
    g.events.length = 0;
    if (g.t < busyUntil) continue;
    if (g.held) {
      const target = plan.shift();
      act(() => { if (C.drop(g, target || 'trash') !== target.split(':')[0] && g.held) C.drop(g, 'trash'); });
      continue;
    }
    plan = nextPlan(g);
    if (plan.length) { const from = plan.shift(); act(() => C.grab(g, from)); }
  }
  return C.result(g);
}
function nextPlan(g) {
  const waiting = g.seats.map((c, i) => ({ c, i })).filter((x) => x.c).sort((a, b) => (b.c.wait / b.c.patience) - (a.c.wait / a.c.patience));
  const st = (s) => C.cookState(s.cook, C.COOK.patty);
  const doneGrill = g.grill.findIndex((s) => s && st(s) !== 'raw');
  const target = waiting.find((x) => !x.c.burgerDone);
  const need = target ? target.c.order.burger : null;
  // Fries and drinks first when they are ready and someone wants them.
  if (g.fryer && C.cookState(g.fryer.cook, C.COOK.fries) === 'done') {
    const w = waiting.find((x) => x.c.order.sides.includes('fries') && !x.c.sidesGot.includes('fries'));
    if (w) return ['fryer', `seat:${w.i}`];
  }
  if (g.fryer && C.cookState(g.fryer.cook, C.COOK.fries) === 'burnt') return ['fryer', 'trash'];
  if (g.drink && g.drink.fill >= C.DRINK_FILL) {
    const w = waiting.find((x) => x.c.order.sides.includes('drink') && !x.c.sidesGot.includes('drink'));
    if (w) return ['drink', `seat:${w.i}`];
  }
  if (need) {
    const have = g.plate;
    if (have.length === need.length && C.sameBurger(have, need)) return ['plate', `seat:${target.i}`];
    if (have.length && (have[0] !== 'bun' || have.length >= need.length)) return ['plate', 'trash'];
    const missing = need.slice(1, -1).filter((k) => true);
    const placed = have.slice(1);
    for (const p of placed) { const j = missing.indexOf(p); if (j >= 0) missing.splice(j, 1); }
    if (!have.length) return ['bin:bun', 'plate'];
    if (missing.length) {
      const k = missing.find((x) => x !== 'patty') || 'patty';
      if (k === 'patty') { if (doneGrill >= 0 && st(g.grill[doneGrill]) === 'done') return [`grill:${doneGrill}`, 'plate']; }
      else return [`bin:${k}`, 'plate'];
    } else return ['bin:top', 'plate'];
  }
  if (doneGrill >= 0 && st(g.grill[doneGrill]) === 'burnt') return [`grill:${doneGrill}`, 'trash'];
  const pattiesWanted = waiting.reduce((s, x) => s + x.c.order.burger.filter((k) => k === 'patty').length, 0) + 1;
  const onGrill = g.grill.filter(Boolean).length;
  const free = g.grill.findIndex((s) => !s);
  if (free >= 0 && onGrill < pattiesWanted) return ['bin:patty', `grill:${free}`];
  if (!g.fryer && C.available(g).includes('potato') && waiting.some((x) => x.c.order.sides.includes('fries') && !x.c.sidesGot.includes('fries'))) return ['bin:potato', 'fryer'];
  if (!g.drink && C.available(g).includes('cup') && waiting.some((x) => x.c.order.sides.includes('drink') && !x.c.sidesGot.includes('drink'))) return ['bin:cup', 'drink'];
  return [];
}

const lines = [];
for (let i = 0; i < C.DAYS.length; i++) {
  const runs = [1, 2, 3].map((s) => play(i, s * 7 + i));
  const slow = play(i, 99, 2.2);
  lines.push(`${C.DAYS[i].name}: coins ${runs.map((r) => r.coins).join(',')} goal ${runs[0].goal} stars ${runs.map((r) => r.stars).join(',')} lost ${runs.map((r) => r.lost).join(',')} | slow player stars ${slow.stars}`);
  console.log(lines[lines.length - 1]);
  if (process.env.SHOW) continue;
  assert(runs.every((r) => r.stars >= 1) && runs.filter((r) => r.stars >= 2).length >= 2, `day ${i}: a steady player should reach the goal`);
  assert(i < 2 || runs.some((r) => r.stars < 3), `day ${i}: three stars should take real effort`);
  assert(slow.stars >= 1 || i >= 3, `day ${i}: a slow player should still earn a star early on`);
}
console.log(lines.join('\n'));
console.log('all chef tests passed');
