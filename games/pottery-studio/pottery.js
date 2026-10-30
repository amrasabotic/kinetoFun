// Clay on a spinning wheel, free of rendering and input, so shaping and scoring can run headless.
// The pot is a stack of rings; a fingertip pushes rings in or drags nearby rings out, and the
// clay's volume stays the same, so squeezing makes it taller and widening makes it shorter.
(function (root) {
  const SLICES = 40;
  const START = { r: 72, h: 210 };
  const MIN_R = 14, MAX_R = 200, MIN_H = 70, MAX_H = 380;
  // The finger drags clay outwards only when it is this close outside the surface.
  const GRIP = 40;
  const BRUSH = 2.6;
  const RATE = 7;

  const sliceH = (pot) => pot.h / SLICES;
  const volumeOf = (pot) => pot.r.reduce((v, r) => v + r * r, 0) * sliceH(pot);

  function createPot() {
    const pot = { r: new Array(SLICES).fill(START.r), h: START.h };
    pot.volume = volumeOf(pot);
    return pot;
  }

  // Radius at a height in px above the wheel; 0 above the rim.
  function radiusAt(pot, y) {
    if (y < 0 || y > pot.h) return 0;
    const f = Math.min(SLICES - 1, Math.max(0, (y / pot.h) * SLICES - 0.5));
    const i = Math.floor(f), t = f - i;
    return pot.r[i] * (1 - t) + pot.r[Math.min(SLICES - 1, i + 1)] * t;
  }

  function settle(pot) {
    for (let i = 0; i < SLICES; i++) pot.r[i] = Math.min(MAX_R, Math.max(MIN_R, pot.r[i]));
    const sum = pot.r.reduce((v, r) => v + r * r, 0);
    pot.h = Math.min(MAX_H, Math.max(MIN_H, (pot.volume * SLICES) / sum));
  }

  // Returns how much clay moved (0 when the finger is not touching).
  function shape(pot, toolY, toolR, dt) {
    if (toolY < -10 || toolY > pot.h + 14) return 0;
    const centre = (toolY / pot.h) * SLICES;
    let moved = 0;
    for (let i = 0; i < SLICES; i++) {
      const w = Math.exp(-(((i + 0.5 - centre) / BRUSH) ** 2));
      if (w < 0.02) continue;
      const gap = toolR - pot.r[i];
      if (gap > GRIP) continue;
      const step = gap * Math.min(1, w * RATE * dt);
      pot.r[i] += step;
      moved += Math.abs(step);
    }
    if (moved) settle(pot);
    return moved;
  }

  // The spinning wheel slowly evens out small bumps.
  function spin(pot, dt) {
    const k = Math.min(1, 0.6 * dt);
    const r = pot.r.slice();
    for (let i = 1; i < SLICES - 1; i++) pot.r[i] = r[i] + k * ((r[i - 1] + r[i + 1]) / 2 - r[i]);
    settle(pot);
  }

  // Targets: a profile of relative radii from base (t=0) to rim (t=1), and height / widest radius.
  const LEVELS = [
    { name: 'Tall Cup',    aspect: 2.9, pts: [[0, 0.7], [1, 1]] },
    { name: 'Wide Bowl',   aspect: 0.75, pts: [[0, 0.5], [0.5, 0.86], [1, 1]] },
    { name: 'Flower Pot',  aspect: 1.35, pts: [[0, 0.62], [1, 1]] },
    { name: 'Round Vase',  aspect: 1.9, pts: [[0, 0.6], [0.45, 1], [0.85, 0.5], [1, 0.58]] },
    { name: 'Hourglass',   aspect: 1.8, pts: [[0, 1], [0.5, 0.5], [1, 1]] },
    { name: 'Bottle',      aspect: 2.4, pts: [[0, 0.9], [0.5, 1], [0.7, 0.45], [1, 0.36]] },
    { name: 'Honey Jar',   aspect: 1.4, pts: [[0, 0.8], [0.3, 1], [0.85, 0.9], [1, 0.72]] },
    { name: 'Goblet',      aspect: 1.6, pts: [[0, 0.6], [0.14, 0.3], [0.45, 0.26], [0.62, 0.72], [1, 1]] },
    { name: 'Lantern',     aspect: 2.0, pts: [[0, 0.6], [0.25, 1], [0.5, 0.68], [0.75, 1], [1, 0.6]] },
    { name: 'Gourd',       aspect: 2.3, pts: [[0, 0.8], [0.3, 1], [0.55, 0.5], [0.75, 0.7], [1, 0.36]] },
    { name: 'Amphora',     aspect: 2.4, pts: [[0, 0.32], [0.4, 1], [0.75, 0.5], [0.9, 0.36], [1, 0.55]] },
    { name: 'Grand Vase',  aspect: 2.6, pts: [[0, 0.5], [0.35, 1], [0.7, 0.4], [0.85, 0.36], [1, 0.8]] },
  ];

  function profile(pts, t) {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const [t0, s0] = pts[i - 1], [t1, s1] = pts[i];
        const u = (t - t0) / (t1 - t0);
        return s0 + (s1 - s0) * (1 - Math.cos(u * Math.PI)) / 2;
      }
    }
    return pts[pts.length - 1][1];
  }

  // Scales a level's shape to the starting clay's volume, so every target can be made.
  function targetFor(level) {
    const s = Array.from({ length: SLICES }, (_, i) => profile(level.pts, (i + 0.5) / SLICES));
    const maxS = Math.max(...s), sum2 = s.reduce((v, x) => v + x * x, 0);
    const vol = START.r * START.r * START.h;
    const k = Math.cbrt((vol * SLICES) / (level.aspect * maxS * sum2));
    const t = { r: s.map((x) => x * k), h: level.aspect * maxS * k };
    t.volume = volumeOf(t);
    return t;
  }

  // Overlap of the two outlines (shared area over combined area), rescaled so an untouched lump scores low.
  function match(pot, target) {
    const top = Math.max(pot.h, target.h);
    let inter = 0, union = 0;
    for (let y = 0.5; y < top; y += 1) {
      const a = radiusAt(pot, y), b = radiusAt(target, y);
      inter += Math.min(a, b); union += Math.max(a, b);
    }
    return union ? Math.max(0, (inter / union - 0.55) / 0.45) : 0;
  }

  const starsFor = (m) => (m >= 0.8 ? 3 : m >= 0.6 ? 2 : 1);
  const scoreFor = (m) => Math.round(m * 100) + starsFor(m) * 20;

  root.Pottery = { SLICES, START, MIN_R, MAX_R, MIN_H, MAX_H, GRIP, LEVELS,
    createPot, radiusAt, shape, spin, targetFor, match, starsFor, scoreFor, volumeOf };
})(typeof window !== 'undefined' ? window : globalThis);
