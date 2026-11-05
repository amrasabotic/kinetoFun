// Run with: node games/pocket-pal/show.test.cjs
require('./show.js');
const S = globalThis.Show;
const assert = require('assert');
const DT = 1 / 30;

// Sprint: pumping at a human pace (2 per second, 0.2 of the frame) gets close to the goal; a still hand goes nowhere; jitter does not count.
function sprint(fn) { const g = S.createSprint(); while (!g.over) stepAt(g, fn); return g; }
function stepAt(g, fn) { S.stepSprint(g, DT, fn(g.t)); }
const pumped = sprint((t) => 0.5 + 0.1 * Math.sin(t * Math.PI * 4));
const lazy = sprint((t) => 0.5 + 0.1 * Math.sin(t * Math.PI * 1.2));
const still = sprint(() => 0.5);
const jitter = sprint((t) => 0.5 + 0.015 * Math.sin(t * 40));
console.log(`sprint: fast ${S.sprintPerf(pumped).toFixed(2)}, slow ${S.sprintPerf(lazy).toFixed(2)}, still ${S.sprintPerf(still).toFixed(2)}, jitter ${S.sprintPerf(jitter).toFixed(2)}`);
assert(S.sprintPerf(pumped) > 0.75 && S.sprintPerf(lazy) < S.sprintPerf(pumped) - 0.2);
assert.strictEqual(S.sprintPerf(still), 0); assert.strictEqual(S.sprintPerf(jitter), 0);

// Hurdles: raising the hand just before each hurdle clears it; holding the hand up only jumps once.
{
  const g = S.createHurdles(3);
  while (!g.over) {
    const next = g.hurdles.find((h) => !h.done);
    const dist = next ? next.x - g.x : 99;
    S.stepHurdles(g, DT, dist > 0 && dist < 8 ? 0.25 : 0.7);
  }
  assert.strictEqual(g.cleared, S.HURDLES.count, 'timed jumps clear every hurdle');
  const up = S.createHurdles(3);
  while (!up.over) S.stepHurdles(up, DT, 0.2);
  assert(up.cleared <= 1, 'a hand held up does not keep jumping');
}

// Dance: a hand that arrives on the pad 0.2s before the beat scores; one that is late by 0.5s misses.
function dance(offset) {
  const g = S.createDance(4);
  while (!g.over) {
    const s = g.steps.find((x) => !x.result);
    S.stepDance(g, DT, s && g.t >= s.at + offset ? s.pad : null);
  }
  return S.dancePerf(g);
}
assert(dance(-0.2) > 0.9); assert(dance(0.5) < 0.2);

// Memory: repeating correctly reaches the best length; a wrong pad ends it.
{
  const g = S.createMemory(9);
  while (!g.over) S.pressMemory(g, g.seq[g.pos]);
  assert.strictEqual(S.memoryPerf(g), 1);
  const w = S.createMemory(9);
  S.pressMemory(w, S.PADS.find((p) => p !== w.seq[0]));
  assert(w.over && S.memoryPerf(w) === 0);
}

// Levels: each is harder for the same player, and 2 stars open the next.
{
  const sprintAt = (lv) => { const g = S.createSprint(null, lv); while (!g.over) S.stepSprint(g, DT, 0.5 + 0.1 * Math.sin(g.t * Math.PI * 3)); return S.sprintPerf(g); };
  const danceAt = (lv) => { const g = S.createDance(4, lv); while (!g.over) { const s = g.steps.find((x) => !x.result); S.stepDance(g, DT, s && g.t >= s.at + 0.05 + (g.steps.indexOf(s) * 0.37) % 0.36 ? s.pad : null); } return S.dancePerf(g); };
  const sp = [0, 1, 2].map(sprintAt), da = [0, 1, 2].map(danceAt);
  console.log('levels: sprint ' + sp.map((v) => v.toFixed(2)) + ', a dancer whose timing varies ' + da.map((v) => v.toFixed(2)));
  assert(sp[0] > sp[1] && sp[1] > sp[2], 'a longer sprint is harder');
  assert(da[0] >= da[1] && da[1] > da[2], 'tighter beats are harder');
  for (const lv of [0, 1, 2]) {
    const g = S.createHurdles(3, lv);
    while (!g.over) { const n = g.hurdles.find((h) => !h.done); const d = n ? n.x - g.x : 99; S.stepHurdles(g, DT, d > 0 && d < 8 ? 0.25 : 0.7); }
    assert.strictEqual(g.cleared, g.hurdles.length, 'well-timed jumps clear every hurdle on level ' + (lv + 1));
    const m = S.createMemory(9, lv);
    while (!m.over) S.pressMemory(m, m.seq[m.pos]);
    assert.strictEqual(S.memoryPerf(m), 1);
  }
  const pet = S.newPet('kitten', 'Kit');
  assert(!S.recordLevel(pet, 'dance', 0, 0.5) && pet.levels.dance === 1, '1 star does not open level 2');
  assert(S.recordLevel(pet, 'dance', 0, 0.7) && pet.levels.dance === 2, '2 stars open level 2');
  S.recordLevel(pet, 'dance', 1, 0.9); S.recordLevel(pet, 'dance', 2, 0.9);
  assert.strictEqual(pet.levels.dance, 3);
  const old = { kind: 'puppy', skills: {} }; S.upgrade(old); assert.strictEqual(old.levels.sprint, 1, 'older saves get levels');
  const a = S.newPet('puppy', 'A'), b = S.newPet('puppy', 'B');
  S.train(a, 'speed', 0.8, 0); S.train(b, 'speed', 0.8, 2);
  assert(b.skills.speed - 20 > (a.skills.speed - 20) * 1.4, 'level 3 trains faster');
}

// Progress: a player at 75% performance who trains the weakest needed skill climbs the shows; count sessions to each first win.
for (const kind of Object.keys(S.PETS)) {
  let s = 7;
  const random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const pet = S.newPet(kind, 'Test');
  const wins = [];
  let sessions = 0;
  for (let level = 0; level < S.SHOWS.length && sessions < 200; ) {
    const perf = () => 0.65 + random() * 0.2;
    const r = S.judge(pet, level, S.SHOWS[level].events.map(perf), random);
    if (r.place <= 2) { wins.push(sessions); level++; continue; }
    const needed = S.SHOWS[level].events.map((e) => S.SKILL_FOR[e]).sort((a, b) => pet.skills[a] - pet.skills[b]);
    for (let k = 0; k < 3; k++) { S.train(pet, needed[0], perf()); sessions++; }
  }
  console.log(`${kind}: top-two finish at training sessions ${wins.join(', ')}`);
  assert.strictEqual(wins.length, S.SHOWS.length, `${kind} never reached the last show`);
  assert(wins[0] <= 3, 'the first show should be winnable almost at once');
  assert(wins[4] >= 25 && wins[4] <= 90, 'the Grand Champion Show should take real training');
}
// A rested player who plays badly cannot win the top show on skill alone.
{
  const pet = S.newPet('puppy', 'Max'); for (const k of S.SKILLS) pet.skills[k] = 100;
  const r = S.judge(pet, 4, [0.1, 0.1, 0.1], () => 0.5);
  assert(r.place > 2, 'playing well still matters at the top');
}
console.log('all show tests passed');
