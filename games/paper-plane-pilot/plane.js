// Flight, levels and scoring, free of rendering and camera, so courses can be checked and played headless.
// The world scrolls left to right; heights run from 0 (top of the sky) to 720 (the ground).
(function (root) {
  const SKY = { top: 70, bottom: 600, ground: 640 };
  const PLANE = { x: 300, r: 18, climb: 300, cruise: 250, boost: 360 };
  const LAND = { y: 590, soft: 120 };
  const HOOP_GAP = 430;

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

  // Each place picks what fills the sky; obstacles are generated well away from the hoop line.
  const PLACES = [
    { name: 'Schoolyard', hoops: 8, wiggle: 90, kinds: [], seed: 11 },
    { name: 'City Park', hoops: 10, wiggle: 120, kinds: ['tree'], seed: 23 },
    { name: 'Over the Lake', hoops: 11, wiggle: 150, kinds: ['tree', 'balloon'], seed: 37 },
    { name: 'Windy Hills', hoops: 12, wiggle: 150, kinds: ['tree'], wind: 2, seed: 41 },
    { name: 'Bird Flock', hoops: 12, wiggle: 170, kinds: ['bird', 'bird', 'balloon'], seed: 53 },
    { name: 'City Rooftops', hoops: 13, wiggle: 170, kinds: ['building', 'building', 'bird'], seed: 67 },
    { name: 'Kite Festival', hoops: 13, wiggle: 190, kinds: ['kite', 'kite', 'tree'], wind: 1, seed: 71 },
    { name: 'Stormy Sky', hoops: 14, wiggle: 190, kinds: ['storm', 'bird', 'balloon'], wind: 3, seed: 83 },
    { name: 'Mountain Pass', hoops: 14, wiggle: 200, kinds: ['mountain', 'bird', 'kite'], wind: 2, seed: 97 },
    { name: 'Grand Tour', hoops: 16, wiggle: 210, kinds: ['building', 'kite', 'storm', 'bird', 'mountain'], wind: 3, seed: 101 },
  ];

  // Most the plane can climb or dive between two hoops while flying at cruise speed, with room to spare.
  const MAX_STEP = PLANE.climb * (HOOP_GAP / PLANE.cruise) * 0.45;

  function buildCourse(i) {
    const p = PLACES[i], r = rng(p.seed);
    const hoops = [];
    let y = 330;
    for (let k = 0; k < p.hoops; k++) {
      const x = 700 + k * HOOP_GAP;
      if (k) y = Math.max(150, Math.min(520, y + (r() * 2 - 1) * Math.min(p.wiggle, MAX_STEP)));
      hoops.push({ x, y, size: 150 - i * 6 });
    }
    const end = hoops[hoops.length - 1].x + 900;
    const lineY = (x) => {
      if (x <= hoops[0].x) return hoops[0].y;
      for (let k = 1; k < hoops.length; k++) if (x <= hoops[k].x) {
        const a = hoops[k - 1], b = hoops[k], u = (x - a.x) / (b.x - a.x);
        return a.y + (b.y - a.y) * u;
      }
      const last = hoops[hoops.length - 1], u = Math.min(1, (x - last.x) / (end - last.x));
      return last.y + (LAND.y - last.y) * u;
    };
    const things = [];
    for (let k = 0; k < hoops.length - 1 && p.kinds.length; k++) {
      const kind = p.kinds[Math.floor(r() * p.kinds.length)], x = hoops[k].x + HOOP_GAP / 2, ly = lineY(x);
      // Above or below the flight line, whichever side has room; later places leave less room.
      const above = ly > 330, berth = 150 - i * 6;
      if (kind === 'tree') things.push({ kind, x, w: 90, top: Math.max(ly + berth, 470) });
      else if (kind === 'building') things.push({ kind, x, w: 120, top: Math.max(ly + berth - 10, 380) });
      else if (kind === 'mountain') things.push({ kind, x, w: 260, top: Math.max(ly + berth + 10, 360) });
      else {
        const r0 = kind === 'storm' ? 70 : kind === 'balloon' ? 34 : 30;
        const cy = above ? Math.max(SKY.top + r0, ly - berth - r0) : Math.min(SKY.bottom - r0, ly + berth + r0);
        things.push({ kind, x, y: cy, r: r0, bob: kind === 'bird' || kind === 'kite' ? 30 : 10 });
      }
    }
    const winds = [];
    for (let k = 0; k < (p.wind || 0); k++) {
      const at = Math.floor((k + 1) * hoops.length / ((p.wind || 0) + 1));
      winds.push({ x0: hoops[at].x - 200, x1: hoops[at].x + 200, push: (k % 2 ? 1 : -1) * 70 });
    }
    return { hoops, things, winds, end, lineY };
  }

  function createFlight(i) {
    const course = buildCourse(i);
    return { level: i, course, x: 0, y: 330, vy: 0, t: 0, passed: 0, missed: 0, bumps: 0, stun: 0, next: 0,
      landed: null, done: false, events: [], speed: PLANE.cruise };
  }

  // A thing's height at a moment: birds and kites bob up and down.
  function thingY(th, t) { return th.y + Math.sin(t * 2 + th.x * 0.01) * (th.bob || 0); }

  function hits(th, x, y, t) {
    if (th.top !== undefined) {
      if (th.kind === 'mountain') {
        const half = th.w / 2, slope = Math.abs(x - th.x) / half;
        return slope < 1 && y + PLANE.r > th.top + (SKY.ground - th.top) * slope;
      }
      return Math.abs(x - th.x) < th.w / 2 + PLANE.r && y + PLANE.r > th.top;
    }
    return Math.hypot(x - th.x, y - thingY(th, t)) < th.r + PLANE.r;
  }

  // target: the height the hand asks for (or null); boost: a fist.
  function step(f, dt, target, boost) {
    if (f.done) return;
    const c = f.course;
    f.t += dt;
    f.speed += ((boost ? PLANE.boost : PLANE.cruise) - f.speed) * Math.min(1, dt * 3);
    const prevX = f.x;
    f.x += f.speed * dt;
    const want = target == null ? f.y : Math.max(SKY.top, Math.min(SKY.bottom, target));
    let vy = Math.max(-PLANE.climb, Math.min(PLANE.climb, (want - f.y) * 4));
    if (f.stun > 0) { f.stun -= dt; vy = Math.sin(f.t * 30) * 120; }
    for (const w of c.winds) if (f.x > w.x0 && f.x < w.x1) vy += w.push;
    f.vy += (vy - f.vy) * Math.min(1, dt * 6);
    f.y = Math.max(SKY.top, Math.min(SKY.bottom, f.y + f.vy * dt));

    while (f.next < c.hoops.length && c.hoops[f.next].x <= f.x) {
      const h = c.hoops[f.next++];
      if (Math.abs(f.y - h.y) < h.size / 2 - 8) { f.passed++; f.events.push({ type: 'hoop', index: f.next - 1 }); }
      else { f.missed++; f.events.push({ type: 'miss', index: f.next - 1 }); }
    }
    if (f.stun <= 0) for (const th of c.things) {
      if (Math.abs(th.x - f.x) < (th.w || 0) / 2 + 80 && hits(th, f.x, f.y, f.t)) {
        f.bumps++; f.stun = 0.6; f.events.push({ type: 'bump', kind: th.kind });
        break;
      }
    }
    if (prevX < c.end && f.x >= c.end) {
      const soft = Math.abs(f.y - LAND.y) < 40 && Math.abs(f.vy) < LAND.soft;
      f.landed = soft ? 'soft' : 'bumpy';
      f.done = true;
      f.events.push({ type: 'land', soft });
    }
  }

  function result(f) {
    const total = f.course.hoops.length, share = f.passed / total;
    const stars = share >= 0.85 && f.bumps <= 1 ? 3 : share >= 0.6 ? 2 : 1;
    return { stars, hoops: f.passed, total, bumps: f.bumps, landing: f.landed, seconds: Math.round(f.t),
      score: f.passed * 20 + (f.landed === 'soft' ? 60 : 20) + stars * 30 - f.bumps * 5 + 40 };
  }

  root.Plane = { SKY, PLANE, LAND, HOOP_GAP, MAX_STEP, PLACES, buildCourse, createFlight, step, result, thingY, hits };
})(typeof window !== 'undefined' ? window : globalThis);
