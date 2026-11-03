// Run with: node games/fire-brigade/brigade.test.cjs
require('./brigade.js');
const B = globalThis.BRIGADE;
const assert = require('assert');
const DT = 1 / 30;

// Rooms tile the building and map back from their centres.
for (const cfg of B.LEVELS) {
  const g = { cfg };
  for (let i = 0; i < cfg.cols * cfg.floors; i++) {
    const r = B.roomRect(cfg, i);
    assert.strictEqual(B.roomAt(g, r.x + r.w / 2, r.y + r.h / 2), i, `${cfg.name}: room ${i} maps back`);
    assert(r.h * 1.5 >= 96 && r.w * 1.5 >= 96, `${cfg.name}: rooms are big enough to aim at on a TV`);
  }
  assert.strictEqual(B.roomAt(g, 10, 10), -1);
}
assert.deepStrictEqual(B.neighbours(B.LEVELS[2], 4).sort(), [1, 3, 5, 7]);
assert(B.roomRect(B.LEVELS[0], 0).y > B.roomRect(B.LEVELS[0], 2).y, 'room 0 is on the ground floor');

// Water puts a fire out; a dry tank stops the water until it refills.
{
  const g = B.createRound(0, { seed: 1 });
  g.next = 99; g.petNext = 99; g.fire[0] = 0.4;
  const r = B.roomRect(g.cfg, 0), aim = { x: r.x + 20, y: r.y + 20, on: true };
  for (let k = 0; k < 30; k++) B.step(g, DT, [aim]);
  assert.strictEqual(g.fire[0], 0, 'one second of water puts out a small fire');
  assert.strictEqual(g.out, 1);
  for (let k = 0; k < 400 && !g.hoses[0].dry; k++) B.step(g, DT, [aim]);
  assert(g.hoses[0].dry, 'spraying empties the tank');
  B.step(g, DT, [aim]);
  assert(!g.hoses[0].on, 'no water from a dry tank');
  for (let k = 0; k < 90; k++) B.step(g, DT, [{ on: false }]);
  B.step(g, DT, [aim]);
  assert(g.hoses[0].on, 'a fist refills the tank');
}
// A pet comes down only once its room's fire is small.
{
  const g = B.createRound(0, { seed: 2 });
  g.next = 99; g.petNext = 99; g.fire[1] = 1; g.pets.push({ room: 1, t: 0, kind: 0, rescue: 0 });
  const r = B.roomRect(g.cfg, 1), aim = { x: r.x + r.w / 2, y: r.y + r.h / 2, on: false };
  for (let k = 0; k < 60; k++) B.step(g, DT, [aim]);
  assert.strictEqual(g.saved, 0, 'no rescue through a big fire');
  for (let k = 0; k < 60; k++) B.step(g, DT, [{ ...aim, on: true }]);
  for (let k = 0; k < 60; k++) B.step(g, DT, [aim]);
  assert.strictEqual(g.saved, 1, 'rescued after the fire is down');
}
// Leaving everything to burn loses the shift.
{
  const g = B.createRound(4, { seed: 3 });
  while (!g.over) B.step(g, DT, []);
  assert.strictEqual(B.result(g).stars, 0, 'doing nothing fails');
}

// A player at human pace: the hand moves `speed` px a second, takes `react` seconds to pick a new target,
// and sprays the biggest fire, or rests on a pet once its room is safe. Fist while the tank is dry.
function play(level, seed, { speed = 750, react = 0.8, players = 1, wobble = 40 } = {}) {
  const g = B.createRound(level, { seed });
  let s = seed * 7 + 3;
  const random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const hands = Array.from({ length: players }, (_, k) => ({ x: 640, y: 650, target: -1, wait: 0 }));
  while (!g.over && g.t < 900) {
    const input = hands.map((h, k) => {
      h.wait -= DT;
      const taken = new Set(hands.filter((o) => o !== h).map((o) => o.target));
      const keep = h.target >= 0 && (g.fire[h.target] > 0 || g.pets.some((p) => p.room === h.target));
      if (!keep && h.wait <= 0) {
        // Pets whose room is calm first, then the biggest fire, sharing the work between two players.
        const pet = g.pets.find((p) => g.fire[p.room] <= B.RESCUE_FIRE && !taken.has(p.room));
        const fires = g.fire.map((v, i) => ({ v: v + (g.pets.some((p) => p.room === i) ? 0.3 : 0), i })).filter((f) => f.v > 0 && !taken.has(f.i)).sort((a, b) => b.v - a.v);
        h.target = pet ? pet.room : fires.length ? fires[0].i : -1;
        h.wait = react;
      }
      if (h.target < 0) return { x: h.x, y: h.y, on: false };
      const r = B.roomRect(g.cfg, h.target), tx = r.x + r.w / 2 + (random() - 0.5) * wobble, ty = r.y + r.h / 2 + (random() - 0.5) * wobble;
      const d = Math.hypot(tx - h.x, ty - h.y), st = speed * DT;
      if (d > 1) { h.x += (tx - h.x) * Math.min(1, st / d); h.y += (ty - h.y) * Math.min(1, st / d); }
      const there = d < 40;
      return { x: h.x, y: h.y, on: there && g.fire[h.target] > 0 && !g.hoses[k].dry };
    });
    B.step(g, DT, input);
    g.events.length = 0;
  }
  return B.result(g);
}

const lines = [];
for (let lv = 0; lv < B.LEVELS.length; lv++) {
  const good = [1, 2, 3].map((k) => play(lv, k * 13 + lv));
  const slow = play(lv, 91 + lv, { speed: 550, react: 1.2, wobble: 60 });
  const duo = play(lv, 57 + lv, { speed: 550, react: 1.2, wobble: 60, players: 2 });
  lines.push(`${B.LEVELS[lv].name}: stars ${good.map((r) => r.stars).join(',')} dmg ${good.map((r) => r.damage).join(',')} pets ${good.map((r) => `${r.saved}/${r.pets}`).join(',')} ${good[0].time}s | slow ${slow.stars}* dmg ${slow.damage} | slow duo ${duo.stars}* dmg ${duo.damage}`);
  if (process.env.SHOW) continue;
  assert(good.every((r) => r.stars >= 1), `level ${lv + 1}: a steady player should pass`);
  assert(good.some((r) => r.stars < 3) || lv < 7, `level ${lv + 1}: three stars should take effort`);
  assert(lv > 4 || slow.stars >= 1, `level ${lv + 1}: a slower player should pass the early levels`);
  assert(duo.stars >= slow.stars, `level ${lv + 1}: two slow players do at least as well as one`);
}
console.log(lines.join('\n'));
console.log('all fire-brigade tests passed');
