// Figures, skating, jumps and judging, free of rendering and camera, so routines can be checked and skated headless.
// The rink is 1280 x 720; the ice runs from x 120 to 1160 and from y 160 to 650.
(function (root) {
  const RINK = { x0: 120, x1: 1160, y0: 160, y1: 650 };
  const SKATE = { accel: 9, maxSpeed: 420, friction: 4.2, r: 22 };
  const GATE_R = 60, TRUE_R = 40, JUMP_SECONDS = 0.6, CONE_R = 26;
  const C = { x: 640, y: 405 };

  // Each figure is a function of t in 0..1 giving a point; it is sampled into a smooth path.
  const FIGURES = {
    circle: (t) => [C.x + 220 * Math.cos(2 * Math.PI * t - Math.PI / 2), C.y + 200 * Math.sin(2 * Math.PI * t - Math.PI / 2)],
    oval: (t) => [C.x + 380 * Math.cos(2 * Math.PI * t - Math.PI / 2), C.y + 180 * Math.sin(2 * Math.PI * t - Math.PI / 2)],
    serpentine: (t) => [200 + 880 * t, C.y + 170 * Math.sin(3 * Math.PI * t)],
    eight: (t) => { const a = 2 * Math.PI * t; return [C.x + 400 * Math.sin(a) / (1 + Math.cos(a) ** 2 * 0), C.y + 190 * Math.sin(2 * a)]; },
    loops: (t) => { const a = 2 * Math.PI * t, r = 70 + 150 * Math.cos(a); return [C.x - 60 + r * Math.cos(a) * 1.6, C.y + r * Math.sin(a) * 1.3]; },
    star: (t) => { const a = 2 * Math.PI * t - Math.PI / 2, r = 230 * (0.72 + 0.28 * Math.cos(5 * (a + Math.PI / 2))); return [C.x + r * Math.cos(a), C.y + r * Math.sin(a) * 0.88]; },
    spiral: (t) => { const a = 4 * Math.PI * t, r = 230 - 150 * t; return [C.x + r * 1.5 * Math.cos(a), C.y + r * Math.sin(a)]; },
    clover: (t) => { const a = 2 * Math.PI * t - Math.PI / 2, r = 160 + 60 * Math.cos(3 * a); return [C.x + r * Math.cos(a) * 1.5, C.y + r * Math.sin(a) * 1.05]; },
    wave: (t) => [180 + 920 * t, C.y + 150 * Math.sin(5 * Math.PI * t)],
    flower: (t) => { const a = 2 * Math.PI * t - Math.PI / 2, r = 150 + 60 * Math.cos(5 * (a + Math.PI / 2)); return [C.x + r * Math.cos(a) * 1.5, C.y + r * Math.sin(a)]; },
    pretzel: (t) => { const a = 2 * Math.PI * t; return [C.x + 400 * Math.sin(3 * a), C.y + 190 * Math.sin(2 * a)]; },
    snail: (t) => { const a = 6 * Math.PI * t, r = 230 - 160 * t; return [C.x + r * 1.5 * Math.sin(a), C.y - r * Math.cos(a) * 0.9]; },
    finale: (t) => { const a = 2 * Math.PI * t; return [C.x + 400 * Math.sin(4 * a), C.y + 190 * Math.sin(3 * a)]; },
    // One long weave across the rink (a 2:3 Lissajous curve), smooth everywhere.
    grand: (t) => { const a = 2 * Math.PI * t; return [C.x + 400 * Math.sin(2 * a), C.y + 190 * Math.sin(3 * a + Math.PI / 2) - 0]; },
  };

  // cones: positions along the routine (0..1) where a jump is needed.
  const LEVELS = [
    { name: 'Warm-up Circle', figure: 'circle', cones: [], par: 16 },
    { name: 'Long Oval', figure: 'oval', cones: [], par: 20 },
    { name: 'Snake Glide', figure: 'serpentine', cones: [], par: 16 },
    { name: 'Figure Eight', figure: 'eight', cones: [], par: 24 },
    { name: 'Hop the Cones', figure: 'circle', cones: [0.3, 0.65], par: 18 },
    { name: 'Loop-de-Loop', figure: 'loops', cones: [0.5], par: 24 },
    { name: 'Star Turn', figure: 'star', cones: [0.2, 0.6], par: 26 },
    { name: 'Spiral Spin', figure: 'spiral', cones: [0.35, 0.75], par: 28 },
    { name: 'Clover Leaf', figure: 'clover', cones: [0.17, 0.5, 0.83], par: 30 },
    { name: 'Big Wave', figure: 'wave', cones: [0.3, 0.7], par: 26 },
    { name: 'Flower Power', figure: 'flower', cones: [0.25, 0.55, 0.85], par: 27 },
    { name: 'Pretzel', figure: 'pretzel', cones: [0.2, 0.5, 0.8], par: 30 },
    { name: 'Snail Shell', figure: 'snail', cones: [0.3, 0.6, 0.85], par: 28 },
    { name: 'The Grand Program', figure: 'grand', cones: [0.15, 0.4, 0.62, 0.88], par: 42 },
    { name: "Champion's Finale", figure: 'finale', cones: [0.1, 0.3, 0.5, 0.7, 0.9], par: 34 },
  ];

  function samplePath(fig, n = 400) {
    const f = FIGURES[fig];
    return Array.from({ length: n + 1 }, (_, i) => f(i / n));
  }

  function createRoutine(levelIndex, seed) {
    const lv = LEVELS[levelIndex], path = samplePath(lv.figure);
    const len = [0];
    for (let i = 1; i < path.length; i++) len.push(len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const total = len[len.length - 1], gateCount = Math.max(8, Math.round(total / 140));
    const at = (u) => { const target = u * total; let i = len.findIndex((l) => l >= target); if (i < 0) i = path.length - 1; return { p: path[i], i }; };
    const gates = Array.from({ length: gateCount }, (_, k) => at((k + 1) / gateCount));
    return {
      level: levelIndex, path, len, total, t: 0, done: false, events: [], rand: rng(seed || 3 + levelIndex),
      pos: { x: path[0][0], y: path[0][1] }, vel: { x: 0, y: 0 }, heading: 0,
      gates: gates.map((g) => ({ x: g.p[0], y: g.p[1], i: g.i, passed: false })), next: 0,
      cones: lv.cones.map((u) => { const c = at(u); return { x: c.p[0], y: c.p[1], hit: false, cleared: false }; }),
      jump: 0, stumble: 0, stumbles: 0, onPath: 0, samples: 0,
    };
  }

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function nearestOnPath(r, x, y) {
    let best = Infinity, bi = 0;
    for (let i = 0; i < r.path.length; i += 2) { const d = Math.hypot(r.path[i][0] - x, r.path[i][1] - y); if (d < best) { best = d; bi = i; } }
    return { d: best, i: bi };
  }

  // hand: where the hand points on the ice, or null; jump: a fist was made.
  function step(r, dt, hand, jump) {
    if (r.done) return;
    r.t += dt;
    if (jump && r.jump <= 0 && r.stumble <= 0) { r.jump = JUMP_SECONDS; r.events.push({ type: 'jump' }); }
    r.jump = Math.max(0, r.jump - dt);
    r.stumble = Math.max(0, r.stumble - dt);
    if (hand && r.stumble <= 0) {
      r.vel.x += (hand.x - r.pos.x) * SKATE.accel * dt;
      r.vel.y += (hand.y - r.pos.y) * SKATE.accel * dt;
    }
    const drag = Math.max(0, 1 - SKATE.friction * dt * (r.stumble > 0 ? 4 : 1));
    r.vel.x *= drag; r.vel.y *= drag;
    const sp = Math.hypot(r.vel.x, r.vel.y);
    if (sp > SKATE.maxSpeed) { r.vel.x *= SKATE.maxSpeed / sp; r.vel.y *= SKATE.maxSpeed / sp; }
    r.pos.x = Math.max(RINK.x0, Math.min(RINK.x1, r.pos.x + r.vel.x * dt));
    r.pos.y = Math.max(RINK.y0, Math.min(RINK.y1, r.pos.y + r.vel.y * dt));
    if (sp > 30) r.heading = Math.atan2(r.vel.y, r.vel.x);

    // How true the line is: the share of moving time spent close to the figure.
    if (sp > 40 && r.stumble <= 0) { r.samples += dt; if (nearestOnPath(r, r.pos.x, r.pos.y).d < TRUE_R) r.onPath += dt; }

    for (const c of r.cones) {
      if (c.cleared || c.hit) continue;
      if (Math.hypot(c.x - r.pos.x, c.y - r.pos.y) < CONE_R + SKATE.r) {
        if (r.jump > 0) { c.cleared = true; r.events.push({ type: 'cleared' }); }
        else { c.hit = true; r.stumble = 0.8; r.stumbles++; r.events.push({ type: 'stumble' }); }
      }
    }
    const g = r.gates[r.next];
    if (g && Math.hypot(g.x - r.pos.x, g.y - r.pos.y) < GATE_R) {
      g.passed = true; r.next++;
      r.events.push({ type: 'gate', index: r.next - 1 });
      if (r.next >= r.gates.length) { r.done = true; r.events.push({ type: 'done' }); }
    }
  }

  // Three judges score the line, the jumps and the pace, each a little differently.
  function result(r) {
    const lv = LEVELS[r.level];
    const accuracy = r.samples ? r.onPath / r.samples : 0;
    const pace = Math.max(0, Math.min(1, (lv.par * 1.6 - r.t) / (lv.par * 0.6)));
    // Every tenth of the time off the line costs two and a half points; stumbles and a slow pace cost a little more.
    const base = 10 - (1 - accuracy) * 25 - r.stumbles * 0.8 + (pace - 0.5) * 0.6;
    const rand = rng(Math.round(r.t * 1000) + r.level);
    const judges = [0, 1, 2].map(() => Math.round(Math.max(1, Math.min(10, base + (rand() - 0.5) * 0.6)) * 10) / 10);
    const avg = judges.reduce((a, b) => a + b, 0) / 3;
    const stars = avg >= 8.5 ? 3 : avg >= 6.5 ? 2 : 1;
    return { stars, judges, average: Math.round(avg * 10) / 10, accuracy: Math.round(accuracy * 100), stumbles: r.stumbles,
      seconds: Math.round(r.t), score: Math.round(avg * 20) + stars * 30 };
  }

  root.Skate = { RINK, SKATE, GATE_R, TRUE_R, JUMP_SECONDS, CONE_R, FIGURES, LEVELS, samplePath, createRoutine, step, result, nearestOnPath };
})(typeof window !== 'undefined' ? window : globalThis);
