// Run with: node games/mix-it-up/mixit.test.cjs
require('./mixit.js');
const M = globalThis.MIX;
const assert = require('assert');
const DT = 1 / 30;

// Recipes match by ratio, and every recipe can be made within the pot's scoop limit.
assert(M.same({ r: 2, b: 2 }, { r: 1, b: 1 }));
assert(!M.same({ r: 2, b: 1 }, { r: 1, b: 1 }));
assert(!M.same({}, { r: 1 }));
for (const r of M.RECIPES) assert(M.scoops(r.mix) <= M.MAX_SCOOPS, `${r.name} fits in the pot`);
const ids = new Set(M.RECIPES.map((r) => JSON.stringify(M.reduce(r.mix))));
assert.strictEqual(ids.size, M.RECIPES.length, 'no two recipes share a ratio');
for (const lv of M.LEVELS) for (const r of M.RECIPES.filter((x) => lv.tiers.includes(x.tier))) for (const k of Object.keys(r.mix)) assert(lv.jars.includes(k), `${lv.name}: ${r.name} needs ${k}`);
// Colours: the wheel mixes like paint, and different recipes look different.
const [or, og, ob] = M.colorOf({ r: 1, y: 1 });
assert(or > 200 && og > 80 && og < 180 && ob < 60, 'red + yellow looks orange');
const [gr, gg, gb] = M.colorOf({ y: 1, b: 1 });
assert(gg > gr && gg > gb, 'yellow + blue looks green');
for (const a of M.RECIPES) for (const b of M.RECIPES) {
  if (a === b) continue;
  const d = Math.hypot(...M.colorOf(a.mix).map((v, i) => v - M.colorOf(b.mix)[i]));
  assert(d > 14, `${a.name} and ${b.name} should look different (${d.toFixed(0)})`);
}

// Grab and release.
{
  const g = M.createRound(1, { seed: 1 });
  const J = M.JAR_SPOTS, C = M.CAULDRON;
  assert.strictEqual(M.grab(g, J.r.x, J.r.y), 'scoop');
  assert.strictEqual(M.release(g, C.x + 60, C.y - 40), 'add');
  assert.strictEqual(M.grab(g, J.r.x, J.r.y), 'scoop');
  assert.strictEqual(M.release(g, 640, 60), 'spill');
  assert.deepStrictEqual(g.cauldron, { r: 1 });
  assert.strictEqual(M.grab(g, C.x, C.y), 'bottle');
  assert.strictEqual(M.release(g, 640, 60), 'back', 'a dropped bottle returns to the pot');
  assert.deepStrictEqual(g.cauldron, { r: 1 });
  M.grab(g, C.x, C.y);
  assert.strictEqual(M.release(g, M.SINK.x, M.SINK.y), 'pour');
  assert.deepStrictEqual(g.cauldron, {});
  for (let k = 0; k < 5; k++) { M.grab(g, J.b.x, J.b.y); M.release(g, C.x, C.y); }
  assert.strictEqual(M.scoops(g.cauldron), M.MAX_SCOOPS, 'the pot holds four scoops');
}

// A player at human pace: the hand moves 900 px a second, each grab or release takes 0.4 s,
// and on hint levels they work out a recipe in `think` seconds or else wait for the hint.
function play(level, seed, { speed = 900, think = 4, slip = 0.05 } = {}) {
  const g = M.createRound(level, { seed });
  let s = seed * 7 + 3;
  const random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const hand = { x: 640, y: 400 };
  let plan = [], busy = 0, target = null;
  const thinkFor = new Map();
  // Bigger recipes take longer to work out, and some days the answer comes slower.
  const knows = (c) => { if (!thinkFor.has(c)) thinkFor.set(c, think * (0.5 + random()) * (1 + 0.35 * (M.scoops(c.recipe.mix) - 1))); return c.t >= thinkFor.get(c); };
  const go = (p, act) => plan.push({ x: p.x, y: p.y, act });
  while (!g.over && g.t < 600) {
    M.step(g, DT);
    g.events.length = 0;
    if (busy > 0) { busy -= DT; continue; }
    if (!plan.length) {
      if (target != null && !g.slots[target]) target = null;
      if (target == null) {
        // Serve whoever has waited longest and whose recipe the player knows by now.
        const ready = g.slots.map((c, i) => ({ c, i })).filter(({ c }) => c && (M.hintShown(g, c) || knows(c))).sort((a, b) => b.c.t - a.c.t);
        if (!ready.length) continue;
        target = ready[0].i;
        const mix = g.slots[target].recipe.mix;
        if (M.scoops(g.cauldron)) { go(M.CAULDRON, 'grab'); go(M.SINK, 'release'); }
        for (const k of Object.keys(mix)) for (let n = 0; n < mix[k]; n++) {
          // Now and then the player scoops the wrong jar and has to start over.
          const wrongKey = random() < slip ? g.cfg.jars[Math.floor(random() * g.cfg.jars.length)] : k;
          go(M.JAR_SPOTS[wrongKey], 'grab'); go(M.CAULDRON, 'release');
        }
        plan.push({ ...M.CAULDRON, act: 'grab', check: mix }); go(M.SLOTS[target], 'release');
      }
      if (!plan.length) continue;
    }
    const p = plan[0], d = Math.hypot(p.x - hand.x, p.y - hand.y), st = speed * DT;
    if (d > 20) { hand.x += (p.x - hand.x) * Math.min(1, st / d); hand.y += (p.y - hand.y) * Math.min(1, st / d); continue; }
    plan.shift();
    // Most of the time the player sees the pot is the wrong colour and starts again.
    if (p.check && !M.same(g.cauldron, p.check) && random() < 0.8) { plan = []; target = null; busy = 0.6; continue; }
    const r = p.act === 'grab' ? M.grab(g, hand.x, hand.y) : M.release(g, hand.x, hand.y);
    if (r === 'wrong' || r === 'served') target = null;
    if (p.act === 'release' && r === 'back') { plan = []; target = null; }
    busy = 0.4;
  }
  return M.result(g);
}

const lines = [];
for (let lv = 0; lv < M.LEVELS.length; lv++) {
  const good = [1, 2, 3].map((k) => play(lv, k * 13 + lv));
  const slow = play(lv, 91 + lv, { speed: 600, think: 8, slip: 0.12 });
  lines.push(`${M.LEVELS[lv].name}: coins ${good.map((r) => r.coins).join(',')} of ${good[0].max}, stars ${good.map((r) => r.stars).join(',')} | slower ${slow.coins} (${slow.stars} stars, ${slow.hearts} hearts)`);
  if (process.env.SHOW) continue;
  assert(good.every((r) => r.stars >= 1), `level ${lv + 1}: a steady player should pass`);
  assert(good.some((r) => r.stars < 3) || lv < 3, `level ${lv + 1}: three stars should take effort`);
  assert(lv > 4 || slow.stars >= 1, `level ${lv + 1}: a slower player should pass the early levels`);
}
console.log(lines.join('\n'));

// Serving random brews fails.
{
  const g = M.createRound(3, { seed: 4 });
  let s = 5;
  const random = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  while (!g.over) {
    M.step(g, DT);
    const i = g.slots.findIndex(Boolean);
    if (i >= 0 && random() < 0.02) {
      g.cauldron = {};
      const keys = 'ryb';
      for (let n = 1 + Math.floor(random() * 3); n > 0; n--) { const k = keys[Math.floor(random() * 3)]; g.cauldron[k] = (g.cauldron[k] || 0) + 1; }
      M.grab(g, M.CAULDRON.x, M.CAULDRON.y); M.release(g, M.SLOTS[i].x, M.SLOTS[i].y);
    }
  }
  const r = M.result(g);
  console.log(`random brews: ${r.coins} coins, ${r.wrong} wrong`);
  assert.strictEqual(r.stars, 0, 'random brewing should not pass');
}
console.log('all mix-it-up tests passed');
