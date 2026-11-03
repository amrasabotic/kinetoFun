// Run with: node games/bridge-builder/bridge.test.cjs
require('./bridge.js');
const B = globalThis.BRIDGE;
const assert = require('assert');
const G = B.GRID;

// Levels: anchors sit on the grid, cliffs leave a gap, and the reference truss fits inside the build area.
for (const cfg of B.LEVELS) {
  for (const a of B.anchors(cfg)) assert(B.canPlace(cfg, a.x, a.y), `${cfg.name}: anchor ${a.x},${a.y} is placeable`);
  assert(cfg.right - cfg.left >= 4 * G, `${cfg.name}: a real gap`);
  const ref = B.reference(cfg);
  for (const n of ref.nodes) assert(B.canPlace(cfg, n.x, n.y), `${cfg.name}: reference joint ${n.x},${n.y} is placeable`);
  for (const e of ref.beams) assert(B.beamLen(ref, e) <= B.MAX_LEN, `${cfg.name}: reference beams fit`);
  for (const e of ref.beams) assert(e.mat !== 'steel' || cfg.steel, `${cfg.name}: steel only once unlocked`);
}

// Building: beams start at a joint, snap to the grid, stay in reach, cost money and can be undone.
{
  const b = B.createBuild(0), cfg = b.cfg, start = B.jointNear(b, cfg.left + 10, cfg.y - 8);
  assert.strictEqual(b.nodes[start].x, cfg.left);
  assert.deepStrictEqual(B.endFor(b, start, cfg.left + 70, cfg.y + 5), { x: cfg.left + G, y: cfg.y }, 'snaps to the nearest grid point');
  const far = B.endFor(b, start, cfg.left + 400, cfg.y);
  assert(far.x - cfg.left <= B.MAX_LEN, 'a long drag stops at the longest beam');
  assert.strictEqual(B.addBeam(b, start, cfg.left + G, cfg.y), 'ok');
  assert.strictEqual(b.nodes.length, B.anchors(cfg).length + 1, 'a new joint was made');
  assert.strictEqual(B.addBeam(b, start, cfg.left + G, cfg.y), 'exists');
  assert.strictEqual(B.cost(b), B.MATERIALS.road.cost);
  assert(!B.canPlace(cfg, cfg.left - G, cfg.y + G), 'no joints inside the cliff');
  const into = B.endFor(b, start, cfg.left - 2 * G, cfg.y + 2 * G);
  assert(!into || B.canPlace(cfg, into.x, into.y), 'aiming into the rock never places a joint there');
  b.material = 'steel';
  assert.strictEqual(B.addBeam(b, start, cfg.left + G, cfg.y - G), 'locked', 'no steel on early levels');
  assert(B.undo(b));
  assert.strictEqual(b.beams.length, 0); assert.strictEqual(b.nodes.length, B.anchors(cfg).length, 'undo removes the joint it made');
  const w = B.createBuild(8);
  assert(!B.canPlace(w.cfg, w.cfg.left + G, w.cfg.water), 'no joints in the water');
  const tight = B.createBuild(0);
  tight.budget = 100;
  assert.strictEqual(B.addBeam(tight, B.jointNear(tight, tight.cfg.left, tight.cfg.y), tight.cfg.left + G, tight.cfg.y), 'budget');
}

// Physics: the reference truss carries every level's vehicle; a bare road and a road with only posts do not.
function rebuild(cfg, keep) {
  const r = B.reference(cfg);
  r.beams = r.beams.filter(keep);
  return r;
}
for (const cfg of B.LEVELS) {
  const ref = B.drive(B.reference(cfg));
  assert(ref.won, `${cfg.name}: the reference bridge holds`);
  assert(ref.maxLoad < 0.95, `${cfg.name}: the reference has some margin (${ref.maxLoad.toFixed(2)})`);
  assert(!B.drive(rebuild(cfg, (e) => e.mat === 'road')).won, `${cfg.name}: a bare road falls`);
}
assert.strictEqual(B.drive(B.createBuild(0)).reason, 'noroad', 'no road means no crossing');
{
  // Dropping a middle diagonal snaps or sags the bridge partway across, not at the start.
  const cfg = B.LEVELS[2], r = B.reference(cfg), mid = r.beams.findIndex((e) => e.mat !== 'road' && r.nodes[e.a].x !== r.nodes[e.b].x && Math.abs(r.nodes[e.a].x - (cfg.left + cfg.right) / 2) <= G);
  r.beams.splice(mid, 1);
  const run = B.drive(r);
  assert(!run.won && run.failS > 0, 'a missing diagonal fails during the drive');
}

// Using the rock pillars: a shallow truss between each pair of supports, posted down to the rocks, beats the plain price.
function pillarBridge(cfg) {
  const b = B.createBuild(B.LEVELS.indexOf(cfg));
  b.material = cfg.steel ? 'steel' : 'wood';
  const y = cfg.y, joint = (x, yy) => b.nodes.findIndex((n) => n.x === x && n.y === yy);
  const put = (x0, y0, x1, y1, mat) => { const r = B.addBeam(b, joint(x0, y0), x1, y1, mat); assert(r === 'ok' || r === 'exists', `${cfg.name}: ${x0},${y0}->${x1},${y1} ${r}`); };
  for (let x = cfg.left; x < cfg.right; x += G) put(x, y, x + G, y, 'road');
  const supports = [cfg.left, ...cfg.pillars.map((p) => p.x), cfg.right];
  for (const p of cfg.pillars) {
    // Climb from the rock to the deck in grid steps, braced to the deck joints either side.
    for (let yy = p.y; yy > y; yy -= G) put(p.x, yy, p.x, yy - G, b.material);
    put(p.x, y + G, p.x - G, y, b.material); put(p.x, y + G, p.x + G, y, b.material);
  }
  for (let s = 0; s < supports.length - 1; s++) {
    const a = supports[s], c = supports[s + 1], mid = (a + c) / 2;
    for (let x = a + G; x < c; x += G) put(x, y, x, y - G, b.material);
    put(a, y, a + G, y - G, b.material);
    for (let x = a + G; x < c - G; x += G) { put(x, y - G, x + G, y - G, b.material); if (x + G <= mid) put(x, y - G, x + G, y, b.material); else put(x, y, x + G, y - G, b.material); }
    put(c - G, y - G, c, y, b.material);
  }
  return b;
}
for (const cfg of B.LEVELS.filter((c) => c.pillars.length)) {
  const b = pillarBridge(cfg), run = B.drive(b), res = B.result(b, run);
  console.log(`${cfg.name}: pillar bridge ${res.cost} vs three-star line ${res.three}, ${run.won ? 'holds' : 'falls'} (${res.stars} stars)`);
  assert(run.won, `${cfg.name}: a pillar bridge holds`);
  assert.strictEqual(res.stars, 3, `${cfg.name}: using the rocks earns three stars`);
}

// Stars and budgets: the reference earns three stars, the budget leaves room, and the levels get bigger.
for (const cfg of B.LEVELS) {
  const b = B.reference(cfg), [three, two] = B.starLines(cfg);
  b.budget = B.budgetFor(cfg);
  assert.strictEqual(B.result(b, { won: true }).stars, 3);
  assert(B.budgetFor(cfg) > two && two > three);
}
{
  // Tracing the example still crosses but keeps at most two stars.
  const b = B.reference(B.LEVELS[0]);
  b.budget = B.budgetFor(b.cfg); b.peeked = true;
  assert.strictEqual(B.result(b, { won: true }).stars, 2, 'the example earns two stars');
}
const first = B.LEVELS.slice(0, 10), last = B.LEVELS.slice(20);
const avg = (ls) => ls.reduce((s, c) => s + B.budgetFor(c), 0) / ls.length;
assert(avg(last) > avg(first) * 2, 'later levels are bigger jobs');
// Pinch tracking with made-up hands: 21 world landmarks in metres, palm 9 cm, thumb and finger tips `gap` metres apart.
function hand3d(gap, turn = 0) {
  const pts = Array.from({ length: 21 }, (_, i) => ({ x: 0.01 * (i % 5), y: -0.02 * Math.floor(i / 5), z: 0 }));
  pts[0] = { x: 0, y: 0, z: 0 }; pts[9] = { x: 0, y: -0.09, z: 0 };
  pts[4] = { x: -gap / 2, y: -0.12, z: 0.01 }; pts[8] = { x: gap / 2, y: -0.12, z: 0.01 };
  // Turning the hand about the vertical axis.
  return pts.map((p) => ({ x: p.x * Math.cos(turn) + p.z * Math.sin(turn), y: p.y, z: -p.x * Math.sin(turn) + p.z * Math.cos(turn) }));
}
{
  const flat = B.pinchGap(null, hand3d(0.06)), turned = B.pinchGap(null, hand3d(0.06, 1.1));
  assert(Math.abs(flat - turned) < 1e-9, 'turning the hand does not change the 3D pinch gap');
  assert(B.pinchGap(null, hand3d(0.015)) < B.PINCH_ON, 'touching tips count as a pinch');
  assert(B.pinchGap(null, hand3d(0.07)) > B.PINCH_OFF, 'a relaxed open hand does not');
  const image = hand3d(0.06, 1.1).map((p) => ({ x: p.x, y: p.y, z: 0 }));
  assert(B.pinchGap(image, null) < flat * 0.6, 'the old flat measure shrinks when the hand turns (why 3D is used)');
}
const FRAME = 1000 / 30;
function feed(p, steps) {
  const out = [];
  let t = steps.t0 || 0;
  for (const [n, f] of steps.list) for (let k = 0; k < n; k++) { t += FRAME; const s = f(k, t); const e = B.trackPinch(p, s.x, s.y, s.gap, t); if (e) out.push({ ...e, t }); }
  return out;
}
{
  // Aim at x 500, then close the fingers over 150 ms while the point between them drifts 30 px: the grab lands at 500.
  const p = B.createPinch();
  const ev = feed(p, { list: [[10, () => ({ x: 500, y: 300, gap: 0.8 })], [5, (k) => ({ x: 500 + 6 * (k + 1), y: 300 + 3 * (k + 1), gap: 0.8 - 0.12 * (k + 1) })], [6, () => ({ x: 530, y: 315, gap: 0.15 })]] });
  assert.strictEqual(ev.length, 1); assert.strictEqual(ev[0].type, 'down');
  assert(Math.abs(ev[0].x - 500) < 8 && Math.abs(ev[0].y - 300) < 5, `the grab lands where the hand aimed (${ev[0].x.toFixed(1)}, ${ev[0].y.toFixed(1)})`);
  // One bad frame mid-drag does not drop the beam; opening for real does, at the point aimed before opening.
  const glitch = feed(p, { t0: 1000, list: [[1, () => ({ x: 600, y: 315, gap: 0.9 })], [6, () => ({ x: 600, y: 315, gap: 0.15 })]] });
  assert.strictEqual(glitch.length, 0, 'a one-frame glitch keeps the pinch');
  const drop = feed(p, { t0: 2000, list: [[20, () => ({ x: 700, y: 400, gap: 0.15 })], [8, (k) => ({ x: 700 + 5 * k, y: 400, gap: 0.9 })]] });
  assert.strictEqual(drop.length, 1); assert.strictEqual(drop[0].type, 'up');
  assert(Math.abs(drop[0].x - 700) < 8, 'the drop lands where the hand aimed before opening');
  // Losing the hand while pinched lets go.
  feed(p, { t0: 4000, list: [[6, () => ({ x: 640, y: 360, gap: 0.15 })]] });
  assert.strictEqual(B.losePinch(p).type, 'up');
  assert.strictEqual(B.losePinch(p), null);
}
{
  // A still hand with 4 px of tracking noise is steady; a moving hand is followed closely.
  const p = B.createPinch();
  let s = 7;
  const noise = () => { s = (s * 1103515245 + 12345) % 2147483648; return (s / 2147483648 - 0.5) * 8; };
  const xs = [];
  feed(p, { list: [[60, () => ({ x: 640 + noise(), y: 360 + noise(), gap: 0.9 })]] });
  feed(p, { t0: 2000, list: [[60, () => { const r = { x: 640 + noise(), y: 360, gap: 0.9 }; return r; }]] });
  for (let k = 0; k < 30; k++) { B.trackPinch(p, 640 + noise(), 360, 0.9, 4000 + k * FRAME); xs.push(p.x); }
  const mean = xs.reduce((a, v) => a + v, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, v) => a + (v - mean) ** 2, 0) / xs.length);
  assert(sd < 1.2, `a still hand is steady (${sd.toFixed(2)} px)`);
  let lag = 0;
  for (let k = 0; k < 30; k++) { const x = 300 + 20 * k; B.trackPinch(p, x, 360, 0.9, 6000 + k * FRAME); if (k > 10) lag = Math.max(lag, x - p.x); }
  assert(lag < 30, `a moving hand is followed closely (${lag.toFixed(1)} px behind at 600 px/s)`);
  console.log(`pinch: still-hand wobble ${sd.toFixed(2)} px, lag ${lag.toFixed(1)} px at 600 px/s`);
}
console.log('all bridge-builder tests passed');
