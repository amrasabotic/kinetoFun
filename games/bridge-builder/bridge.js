// Bridge Builder rules: levels, building, beam physics and the test drive. No drawing, so it runs headless in tests.
(function (root) {
  const GRID = 60;
  const MAX_LEN = 150; // longest beam: two grid steps across, or one step diagonally plus one straight
  const MATERIALS = {
    road: { name: 'Road', cost: 120, strength: 1000, weight: 14, E: 400000 },
    wood: { name: 'Wood', cost: 60, strength: 800, weight: 10, E: 300000 },
    steel: { name: 'Steel', cost: 150, strength: 2000, weight: 16, E: 800000 },
  };
  const VEHICLES = {
    car: { name: 'Car', weight: 60, wheelbase: 56, r: 14, speed: 140 },
    van: { name: 'Van', weight: 100, wheelbase: 64, r: 15, speed: 130 },
    truck: { name: 'Truck', weight: 160, wheelbase: 76, r: 16, speed: 120 },
    bus: { name: 'Bus', weight: 220, wheelbase: 90, r: 17, speed: 110 },
  };

  // Cliffs are flat-topped; left ends at `left`, right starts at `right`, both at height `y`. All on the 60 px grid.
  // pillars: rock columns with a fixed joint on top. faces: extra fixed joints down each cliff face (in grid steps).
  // water: no joints at or below this height (boats pass). steel: steel unlocked.
  const L = (name, left, right, y, more = {}) => ({ name, left, right, y, vehicle: 'car', pillars: [], faces: 0, water: 0, steel: false, ...more });
  const LEVELS = [
    L('First plank', 480, 720, 420),
    L('A little wider', 420, 780, 420),
    L('Triangles', 360, 840, 420, { faces: 1 }),
    L('Over the stream', 360, 840, 360, { faces: 2 }),
    L('Rock in the middle', 300, 900, 420, { pillars: [{ x: 600, y: 540 }] }),
    L('The van', 420, 840, 420, { vehicle: 'van', faces: 1 }),
    L('Deep valley', 300, 900, 360, { faces: 2 }),
    L('Two rocks', 300, 960, 420, { pillars: [{ x: 480, y: 540 }, { x: 780, y: 540 }] }),
    L('Boats below', 360, 900, 420, { water: 480 }),
    L('Van on a budget', 300, 900, 420, { vehicle: 'van', faces: 1 }),
    L('Steel arrives', 300, 960, 420, { vehicle: 'truck', steel: true, faces: 1 }),
    L('Tall rock', 240, 1020, 360, { pillars: [{ x: 600, y: 480 }], steel: true }),
    L('Truck over water', 360, 900, 420, { vehicle: 'truck', water: 480, steel: true }),
    L('Wide river', 240, 1020, 420, { faces: 2, steel: true }),
    L('Low cliffs', 300, 960, 480, { faces: 1, steel: true, vehicle: 'van' }),
    L('Stepping stones', 180, 1080, 420, { pillars: [{ x: 420, y: 540 }, { x: 660, y: 600 }, { x: 900, y: 540 }], steel: true }),
    L('Heavy load', 360, 900, 420, { vehicle: 'bus', steel: true, faces: 1 }),
    L('Canal', 300, 960, 420, { water: 480, steel: true, vehicle: 'van' }),
    L('High road', 300, 960, 300, { faces: 2, steel: true, vehicle: 'truck' }),
    L('Bus stop', 240, 1020, 420, { vehicle: 'bus', steel: true, pillars: [{ x: 660, y: 540 }] }),
    L('The gorge', 180, 1080, 360, { faces: 2, steel: true, vehicle: 'van' }),
    L('Busy harbour', 300, 960, 420, { water: 480, steel: true, vehicle: 'truck' }),
    L('Single rock', 180, 1080, 420, { pillars: [{ x: 600, y: 600 }], steel: true, vehicle: 'truck' }),
    L('Bus over water', 360, 960, 420, { water: 480, steel: true, vehicle: 'bus' }),
    L('Mountain pass', 240, 1020, 300, { faces: 2, steel: true, vehicle: 'bus' }),
    L('Long haul', 180, 1080, 420, { faces: 1, steel: true, vehicle: 'truck' }),
    L('Twin towers', 180, 1080, 420, { pillars: [{ x: 480, y: 480 }, { x: 780, y: 480 }], steel: true, vehicle: 'bus' }),
    L('Shipping lane', 240, 1020, 420, { water: 480, steel: true, vehicle: 'truck' }),
    L('Grand canyon', 180, 1080, 360, { faces: 2, steel: true, vehicle: 'bus' }),
    L('Master builder', 180, 1080, 420, { water: 480, steel: true, vehicle: 'bus' }),
  ];

  // ---------- building ----------
  function anchors(cfg) {
    const out = [{ x: cfg.left, y: cfg.y }, { x: cfg.right, y: cfg.y }];
    for (let k = 1; k <= cfg.faces; k++) out.push({ x: cfg.left, y: cfg.y + k * GRID }, { x: cfg.right, y: cfg.y + k * GRID });
    for (const p of cfg.pillars) out.push({ x: p.x, y: p.y });
    return out;
  }
  // Terrain as solid boxes: the two cliffs and the rock pillars.
  function solids(cfg) {
    const s = [{ x0: -100, x1: cfg.left, y0: cfg.y }, { x0: cfg.right, x1: 1380, y0: cfg.y }];
    for (const p of cfg.pillars) s.push({ x0: p.x - 30, x1: p.x + 30, y0: p.y });
    return s;
  }
  const inRock = (cfg, x, y) => solids(cfg).some((s) => x > s.x0 && x < s.x1 && y > s.y0);
  // Joints sit on the grid, between the cliffs, above the water line and above the bottom of the screen.
  function canPlace(cfg, x, y) {
    if (x % GRID || y % GRID) return false;
    if (x < cfg.left || x > cfg.right || y < 120 || y > 660) return false;
    if (cfg.water && y >= cfg.water) return false;
    return !inRock(cfg, x, y) || anchors(cfg).some((a) => a.x === x && a.y === y);
  }
  const snap = (v) => Math.round(v / GRID) * GRID;

  function createBuild(level) {
    const cfg = LEVELS[level];
    const nodes = anchors(cfg).map((a) => ({ x: a.x, y: a.y, fixed: true }));
    return { level, cfg, nodes, beams: [], history: [], material: 'road', budget: budgetFor(cfg) };
  }
  const nodeAt = (b, x, y) => b.nodes.findIndex((n) => n.x === x && n.y === y);
  const beamLen = (b, beam) => Math.hypot(b.nodes[beam.a].x - b.nodes[beam.b].x, b.nodes[beam.a].y - b.nodes[beam.b].y);
  const beamCost = (len, mat) => Math.round((len / GRID) * MATERIALS[mat].cost);
  const cost = (b) => b.beams.reduce((s, beam) => s + beamCost(beamLen(b, beam), beam.mat), 0);

  // Nearest joint to a point (for starting a beam), within `reach` pixels.
  function jointNear(b, x, y, reach = 45) {
    let best = -1, d = reach;
    b.nodes.forEach((n, i) => { const e = Math.hypot(n.x - x, n.y - y); if (e <= d) { d = e; best = i; } });
    return best;
  }
  // Where a beam dragged from joint `from` toward (x, y) would end: the grid point under the hand, pulled back within reach.
  function endFor(b, from, x, y) {
    const a = b.nodes[from];
    let dx = x - a.x, dy = y - a.y;
    const d = Math.hypot(dx, dy);
    if (d > MAX_LEN) { dx *= MAX_LEN / d; dy *= MAX_LEN / d; }
    let best = null;
    // Try the snapped point and its neighbours; keep the closest one that fits.
    for (const ox of [0, -GRID, GRID]) for (const oy of [0, -GRID, GRID]) {
      const ex = snap(a.x + dx) + ox, ey = snap(a.y + dy) + oy, len = Math.hypot(ex - a.x, ey - a.y);
      if (!len || len > MAX_LEN + 0.5 || !canPlace(b.cfg, ex, ey)) continue;
      const miss = Math.hypot(ex - a.x - dx, ey - a.y - dy);
      if (!best || miss < best.miss) best = { x: ex, y: ey, miss };
    }
    return best && { x: best.x, y: best.y };
  }
  function addBeam(b, from, x, y, mat = b.material) {
    if (mat === 'steel' && !b.cfg.steel) return 'locked';
    const end = endFor(b, from, x, y);
    if (!end) return 'nowhere';
    let to = nodeAt(b, end.x, end.y);
    if (to === from) return 'nowhere';
    if (to >= 0 && b.beams.some((e) => (e.a === from && e.b === to) || (e.a === to && e.b === from))) return 'exists';
    const len = Math.hypot(end.x - b.nodes[from].x, end.y - b.nodes[from].y);
    if (cost(b) + beamCost(len, mat) > b.budget) return 'budget';
    const made = to < 0;
    if (made) { b.nodes.push({ x: end.x, y: end.y, fixed: false }); to = b.nodes.length - 1; }
    b.beams.push({ a: from, b: to, mat });
    b.history.push({ made });
    return 'ok';
  }
  function undo(b) {
    const h = b.history.pop();
    if (!h) return false;
    b.beams.pop();
    if (h.made) b.nodes.pop();
    return true;
  }
  function clear(b) { while (undo(b)) { /* empty */ } }

  // ---------- reference bridges ----------
  // A road deck along the cliff tops with a Pratt truss above it, one grid step deep or two on long spans:
  // a plain, always-rigid solution that every budget and star line is set from. Pillars are left for the player to find.
  function reference(cfg, mat = refMat(cfg)) {
    const b = { cfg, nodes: anchors(cfg).map((a) => ({ ...a, fixed: true })), beams: [], history: [], budget: Infinity, material: 'road' };
    const n = (cfg.right - cfg.left) / GRID, y = cfg.y, d = n > 8 ? 2 * GRID : GRID;
    const at = (x, yy) => { let i = nodeAt(b, x, yy); if (i < 0) { b.nodes.push({ x, y: yy, fixed: false }); i = b.nodes.length - 1; } return i; };
    const link = (i, j, m) => { if (!b.beams.some((e) => (e.a === i && e.b === j) || (e.a === j && e.b === i))) b.beams.push({ a: i, b: j, mat: m }); };
    const deck = (k) => at(cfg.left + k * GRID, y), top = (k) => at(cfg.left + k * GRID, y - d);
    for (let k = 0; k < n; k++) link(deck(k), deck(k + 1), 'road');
    for (let k = 1; k < n; k++) { link(top(k), deck(k), mat); if (k < n - 1) link(top(k), top(k + 1), mat); }
    link(deck(0), top(1), mat); link(top(n - 1), deck(n), mat);
    // Diagonals lean toward the middle, so each one pulls rather than pushes.
    for (let k = 1; k < n - 1; k++) { if (k + 1 <= n / 2) link(top(k), deck(k + 1), mat); else link(deck(k), top(k + 1), mat); }
    return b;
  }
  // Wood when a wooden truss carries this level's vehicle with a little to spare, steel otherwise; worked out once per level.
  const refCache = new Map();
  function refMat(cfg) {
    if (!refCache.has(cfg)) { const run = drive(reference(cfg, 'wood')); refCache.set(cfg, !cfg.steel || (run.won && run.maxLoad < 0.9) ? 'wood' : 'steel'); }
    return refCache.get(cfg);
  }
  function budgetFor(cfg) { return Math.ceil((cost(reference(cfg)) * 1.3) / 50) * 50; }
  // Three stars at or under the plain truss's price, two a little over it.
  function starLines(cfg) {
    const c = cost(reference(cfg));
    return [c, Math.round(c * 1.15)];
  }

  // ---------- the test drive ----------
  // The bridge is solved as a pin-jointed frame: for each truck position the stiffness equations give every beam's exact force.
  const DISP_FAIL = 24; // a road joint that sinks further than this has nothing real holding it up
  const STEP = 10;

  // The road the truck follows: the shortest chain of drivable road beams from the left cliff edge to the right one.
  function roadPath(b, broken = new Set()) {
    const { cfg } = b, from = nodeAt(b, cfg.left, cfg.y), to = nodeAt(b, cfg.right, cfg.y);
    const dist = b.nodes.map(() => Infinity), prev = b.nodes.map(() => -1), done = new Set();
    dist[from] = 0;
    for (;;) {
      let u = -1;
      dist.forEach((d, i) => { if (!done.has(i) && d < Infinity && (u < 0 || d < dist[u])) u = i; });
      if (u < 0 || u === to) break;
      done.add(u);
      b.beams.forEach((e, k) => {
        if (e.mat !== 'road' || broken.has(k) || (e.a !== u && e.b !== u)) return;
        const v = e.a === u ? e.b : e.a, A = b.nodes[u], B = b.nodes[v];
        // Too steep to drive, or going backwards.
        if (Math.abs(B.y - A.y) > Math.abs(B.x - A.x) || B.x <= A.x) return;
        const d = dist[u] + Math.hypot(B.x - A.x, B.y - A.y);
        if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      });
    }
    if (dist[to] === Infinity) return null;
    const chain = [];
    for (let v = to; v >= 0; v = prev[v]) chain.unshift(v);
    return chain;
  }

  function solveFrame(b, broken, loads) {
    const idx = [];
    let n = 0;
    b.nodes.forEach((nd) => idx.push(nd.fixed ? -1 : n++));
    n *= 2;
    const K = Array.from({ length: n }, () => new Float64Array(n)), f = new Float64Array(n), ks = [];
    b.nodes.forEach((nd, i) => { if (idx[i] >= 0) { f[idx[i] * 2] = loads[i * 2]; f[idx[i] * 2 + 1] = loads[i * 2 + 1]; } });
    b.beams.forEach((e, k) => {
      if (broken.has(k)) return;
      const A = b.nodes[e.a], B = b.nodes[e.b], L = Math.hypot(B.x - A.x, B.y - A.y), c = (B.x - A.x) / L, sn = (B.y - A.y) / L, kk = MATERIALS[e.mat].E / L;
      ks.push(kk);
      const m = [[c * c, c * sn], [c * sn, sn * sn]], ends = [[idx[e.a], 1], [idx[e.b], -1]];
      for (const [i, si] of ends) for (const [j, sj] of ends) {
        if (i < 0 || j < 0) continue;
        for (let p = 0; p < 2; p++) for (let q = 0; q < 2; q++) K[i * 2 + p][j * 2 + q] += si * sj * kk * m[p][q];
      }
    });
    // A whisper of stiffness at every joint, so a loose joint sags a long way instead of making the equations unsolvable.
    const eps = (ks.length ? Math.max(...ks) : 1) * 1e-7;
    for (let i = 0; i < n; i++) K[i][i] += eps;
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(K[r][col]) > Math.abs(K[piv][col])) piv = r;
      if (piv !== col) { const t = K[col]; K[col] = K[piv]; K[piv] = t; const tf = f[col]; f[col] = f[piv]; f[piv] = tf; }
      const d = K[col][col], row = K[col];
      for (let r = col + 1; r < n; r++) {
        const m = K[r][col] / d;
        if (!m) continue;
        const kr = K[r];
        for (let q = col; q < n; q++) kr[q] -= m * row[q];
        f[r] -= m * f[col];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) { let v = f[r]; for (let q = r + 1; q < n; q++) v -= K[r][q] * x[q]; x[r] = v / K[r][r]; }
    const u = b.nodes.map((_, i) => (idx[i] < 0 ? [0, 0] : [x[idx[i] * 2], x[idx[i] * 2 + 1]]));
    const force = b.beams.map((e, k) => {
      if (broken.has(k)) return 0;
      const A = b.nodes[e.a], B = b.nodes[e.b], L = Math.hypot(B.x - A.x, B.y - A.y);
      const stretch = ((B.x - A.x) * (u[e.b][0] - u[e.a][0]) + (B.y - A.y) * (u[e.b][1] - u[e.a][1])) / L;
      return (MATERIALS[e.mat].E / L) * stretch;
    });
    return { u, force };
  }

  // The truck's way across: cliff top up to the bridge, the road chain, then the far cliff top.
  function route(b, chain) {
    const { cfg } = b, pts = [{ x: 20, y: cfg.y, node: -1 }];
    for (const i of chain) pts.push({ x: b.nodes[i].x, y: b.nodes[i].y, node: i });
    pts.push({ x: 1400, y: cfg.y, node: -1 });
    let acc = 0;
    pts.forEach((p, i) => { if (i) acc += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y); p.s = acc; });
    return pts;
  }
  function pointOn(pts, s) {
    for (let i = 1; i < pts.length; i++) {
      if (s <= pts[i].s || i === pts.length - 1) {
        const a = pts[i - 1], c = pts[i], t = Math.max(0, Math.min(1, (s - a.s) / (c.s - a.s || 1)));
        return { x: a.x + (c.x - a.x) * t, y: a.y + (c.y - a.y) * t, a: a.node, b: c.node, t };
      }
    }
    return null;
  }

  // Drives the truck across in STEP-pixel moves. A beam past its strength breaks and the rest is solved again;
  // the run fails once the road loses a beam or a road joint sinks too far.
  function drive(b, opts = {}) {
    const { cfg } = b, v = VEHICLES[cfg.vehicle], broken = new Set(), events = [], samples = [];
    const base = new Float64Array(b.nodes.length * 2);
    b.beams.forEach((e) => {
      const w = (MATERIALS[e.mat].weight * beamLen(b, e)) / GRID / 2;
      base[e.a * 2 + 1] += w; base[e.b * 2 + 1] += w;
    });
    const chain = roadPath(b);
    if (!chain) return { won: false, reason: 'noroad', failS: cfg.left - 20 - v.wheelbase / 2, events, samples, route: route(b, []), maxLoad: 0 };
    const pts = route(b, chain), roadBeams = [];
    for (let i = 1; i < chain.length; i++) roadBeams.push(b.beams.findIndex((e) => e.mat === 'road' && ((e.a === chain[i - 1] && e.b === chain[i]) || (e.b === chain[i - 1] && e.a === chain[i]))));
    const end = pts[pts.length - 2].s + 40;
    let maxLoad = 0, idle = null;
    for (let s = 40; s <= end; s += STEP) {
      const loads = Float64Array.from(base);
      let onBridge = false;
      for (const ax of [pointOn(pts, s), pointOn(pts, s + v.wheelbase)]) {
        if (ax.a < 0 && ax.b < 0) continue;
        onBridge = true;
        if (ax.a >= 0) loads[ax.a * 2 + 1] += (v.weight / 2) * (1 - ax.t);
        if (ax.b >= 0) loads[ax.b * 2 + 1] += (v.weight / 2) * ax.t;
      }
      // With no axle on the bridge only its own weight counts, so that solve is reused.
      let res = !onBridge && idle && idle.n === broken.size ? idle.res : null;
      for (;;) {
        if (!res) res = solveFrame(b, broken, loads);
        let worst = -1, wl = 1;
        res.force.forEach((F, k) => {
          if (broken.has(k)) return;
          const l = Math.abs(F) / MATERIALS[b.beams[k].mat].strength;
          maxLoad = Math.max(maxLoad, opts.noBreak ? l : Math.min(l, 1));
          if (l > wl && !opts.noBreak) { wl = l; worst = k; }
        });
        const sunk = chain.some((i) => Math.hypot(res.u[i][0], res.u[i][1]) > DISP_FAIL);
        if (worst < 0 || sunk) {
          if (!onBridge) idle = { n: broken.size, res };
          samples.push({ s, u: res.u, force: res.force, broken: new Set(broken) });
          if (sunk || roadBeams.some((k) => broken.has(k))) return { won: false, reason: sunk ? 'sag' : 'snap', failS: s, events, samples, route: pts, maxLoad: 1 };
          break;
        }
        broken.add(worst); events.push({ s, beam: worst }); res = null;
      }
    }
    return { won: true, failS: null, events, samples, route: pts, maxLoad };
  }

  function result(b, run) {
    const c = cost(b), [three, two] = starLines(b.cfg);
    // Copying the example still crosses, but three stars are kept for a bridge the player worked out alone.
    const full = !run.won ? 0 : c <= three ? 3 : c <= two ? 2 : 1, stars = b.peeked ? Math.min(2, full) : full;
    return { won: run.won, cost: c, budget: b.budget, stars, three, two, peeked: !!b.peeked, score: run.won ? 100 + Math.max(0, b.budget - c) : 0 };
  }

  // ---------- pinch tracking ----------
  // Pinch is the thumb-to-finger gap over the palm length, both measured in 3D, so turning the hand does not change it.
  const PINCH_ON = 0.35, PINCH_OFF = 0.5;
  const GRAB_MS = 70, LET_GO_MS = 120;
  // Closing the fingers drags the point between them; grabs and drops use where the hand was this long before.
  const LOOKBACK_MS = 110;

  // One Euro filter: heavy smoothing while the hand is still, light while it moves, so aiming is steady without lag.
  function oneEuro(minCutoff = 1.2, beta = 0.01, dCutoff = 1) {
    let x = null, dx = 0, last = 0;
    const alpha = (cut, dt) => 1 / (1 + 1 / (2 * Math.PI * cut * dt));
    return (v, now) => {
      if (x === null || now - last > 300) { x = v; dx = 0; last = now; return v; }
      const dt = Math.max(1e-3, (now - last) / 1000);
      last = now;
      const d = (v - x) / dt;
      dx += alpha(dCutoff, dt) * (d - dx);
      x += alpha(minCutoff + beta * Math.abs(dx), dt) * (v - x);
      return x;
    };
  }
  const span3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
  // How closed the pinch is, from world landmarks when the tracker gives them, else from image landmarks.
  function pinchGap(lm, world) {
    const p = world && world.length === 21 ? world : lm;
    return span3(p[4], p[8]) / (span3(p[0], p[9]) || 1e-6);
  }

  function createPinch() {
    return { on: false, raw: false, rawSince: 0, x: null, y: null, gap: 1, hist: [], fx: oneEuro(), fy: oneEuro() };
  }
  // x, y: the aim point in stage pixels; gap from pinchGap. Returns 'down' or 'up' with the point to use, or null.
  function trackPinch(p, x, y, gap, now) {
    p.x = p.fx(x, now); p.y = p.fy(y, now); p.gap = gap;
    p.hist.push({ t: now, x: p.x, y: p.y });
    while (p.hist.length > 2 && now - p.hist[0].t > 400) p.hist.shift();
    // Between the two lines the last state holds, so a half-closed hand never flickers.
    const raw = gap < PINCH_ON ? true : gap > PINCH_OFF ? false : p.on;
    if (raw !== p.raw) { p.raw = raw; p.rawSince = now; }
    if (raw === p.on || now - p.rawSince < (raw ? GRAB_MS : LET_GO_MS)) return null;
    p.on = raw;
    const at = pointAt(p, p.rawSince - LOOKBACK_MS);
    return { type: raw ? 'down' : 'up', x: at.x, y: at.y };
  }
  function pointAt(p, t) {
    let best = p.hist[0];
    for (const h of p.hist) { if (h.t <= t) best = h; else break; }
    return best || { x: p.x, y: p.y };
  }
  // The hand left the camera: a held pinch lets go where it was last seen.
  function losePinch(p) {
    const was = p.on;
    p.on = false; p.raw = false; p.hist.length = 0;
    return was ? { type: 'up', x: p.x, y: p.y } : null;
  }
  // 0 with the fingers wide open, 1 at the pinch line; drawn as the closing cursor ring.
  const pinchLevel = (gap) => Math.max(0, Math.min(1, (1.0 - gap) / (1.0 - PINCH_ON)));

  root.BRIDGE = {
    GRID, MAX_LEN, MATERIALS, VEHICLES, LEVELS,
    anchors, solids, canPlace, createBuild, jointNear, endFor, addBeam, undo, clear, cost, beamCost, beamLen,
    reference, budgetFor, starLines, roadPath, route, pointOn, drive, result,
    PINCH_ON, PINCH_OFF, pinchGap, createPinch, trackPinch, losePinch, pinchLevel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
