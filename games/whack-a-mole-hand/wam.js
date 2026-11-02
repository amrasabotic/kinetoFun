// Whack-a-Mole rules: holes, moles, levels and scoring. No drawing, so it runs headless in tests.
(function (root) {
  // Hole centres on the board, 0..1 both ways, three rows of three.
  const HOLES = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) HOLES.push({ x: 0.2 + c * 0.3, y: 0.22 + r * 0.3 });
  // A smash counts anywhere within this distance of a hole centre: generous, since a hand on a sofa is not a mouse.
  const HIT_RADIUS = 0.14;
  const RISE = 0.25, SINK = 0.2;

  // up: seconds a mole stays up; gap: seconds between new moles; max: moles up at once.
  const LEVELS = [
    { name: 'First moles', time: 40, up: 2.4, gap: 1.6, max: 1, gold: 0, helmet: 0, bomb: 0, goal: 240 },
    { name: 'Getting busy', time: 45, up: 2.1, gap: 1.3, max: 2, gold: 0, helmet: 0, bomb: 0, goal: 360 },
    { name: 'Golden mole', time: 45, up: 2.0, gap: 1.2, max: 2, gold: 0.12, helmet: 0, bomb: 0, goal: 500 },
    { name: 'Watch the bombs', time: 45, up: 2.0, gap: 1.2, max: 2, gold: 0.1, helmet: 0, bomb: 0.15, goal: 350 },
    { name: 'Hard hats', time: 50, up: 2.2, gap: 1.2, max: 2, gold: 0.1, helmet: 0.18, bomb: 0.1, goal: 550 },
    { name: 'Speed up', time: 50, up: 1.7, gap: 1.0, max: 3, gold: 0.1, helmet: 0.12, bomb: 0.12, goal: 650 },
    { name: 'Mole party', time: 50, up: 1.6, gap: 0.9, max: 3, gold: 0.12, helmet: 0.15, bomb: 0.15, goal: 680 },
    { name: 'Quick paws', time: 55, up: 1.4, gap: 0.85, max: 3, gold: 0.12, helmet: 0.15, bomb: 0.15, goal: 760 },
    { name: 'Mole storm', time: 55, up: 1.3, gap: 0.75, max: 4, gold: 0.14, helmet: 0.15, bomb: 0.18, goal: 630 },
    { name: 'Mole King', time: 60, up: 1.2, gap: 0.7, max: 4, gold: 0.15, helmet: 0.18, bomb: 0.2, goal: 560 },
  ];
  const POINTS = { mole: 10, gold: 30, helmet: 20 };
  const LIVES = 3;

  function rng(seed) {
    let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function createRound(level, opts = {}) {
    return {
      level, cfg: LEVELS[level], t: 0, over: false, score: 0, lives: LIVES, combo: 0, best: 0, hits: 0, misses: 0, escaped: 0, bombs: 0,
      holes: HOLES.map(() => null), next: 1, random: opts.seed != null ? rng(opts.seed) : Math.random, events: [],
    };
  }

  function spawn(g) {
    const up = g.holes.filter(Boolean).filter((m) => m.state !== 'gone').length;
    if (up >= g.cfg.max) return;
    const free = g.holes.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
    if (!free.length) return;
    const i = free[Math.floor(g.random() * free.length)];
    const r = g.random(), c = g.cfg;
    const kind = r < c.bomb ? 'bomb' : r < c.bomb + c.gold ? 'gold' : r < c.bomb + c.gold + c.helmet ? 'helmet' : 'mole';
    // Golden moles duck back sooner; bombs linger so there is time to notice them.
    const stay = c.up * (kind === 'gold' ? 0.7 : kind === 'bomb' ? 1.2 : 1);
    g.holes[i] = { kind, state: 'rise', t: 0, stay, hp: kind === 'helmet' ? 2 : 1 };
    g.events.push({ type: 'pop', hole: i, kind });
  }

  function step(g, dt) {
    if (g.over) return;
    g.t += dt;
    g.holes.forEach((m, i) => {
      if (!m) return;
      m.t += dt;
      if (m.state === 'rise' && m.t >= RISE) { m.state = 'up'; m.t = 0; }
      else if (m.state === 'up' && m.t >= m.stay) {
        m.state = 'sink'; m.t = 0;
        if (m.kind !== 'bomb') { g.escaped++; g.combo = 0; g.events.push({ type: 'escape', hole: i }); }
      } else if ((m.state === 'sink' || m.state === 'bonk') && m.t >= SINK) g.holes[i] = null;
    });
    g.next -= dt;
    if (g.next <= 0 && g.t < g.cfg.time - 1) { spawn(g); g.next = g.cfg.gap * (0.75 + g.random() * 0.5); }
    if (g.t >= g.cfg.time || g.lives <= 0) { g.over = true; g.events.push({ type: 'over' }); }
  }

  // How far out of its hole a mole is, 0..1, for drawing and for whether it can be hit.
  function height(m) {
    if (!m) return 0;
    if (m.state === 'rise') return m.t / RISE;
    if (m.state === 'up') return 1;
    return Math.max(0, 1 - m.t / SINK);
  }

  function holeAt(x, y) {
    let best = -1, bd = HIT_RADIUS;
    HOLES.forEach((h, i) => { const d = Math.hypot(x - h.x, y - h.y); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  // A smash at board position x, y (0..1). A mole half way out or more can be hit.
  function smash(g, x, y) {
    if (g.over) return null;
    const i = holeAt(x, y);
    const m = i >= 0 ? g.holes[i] : null;
    if (!m || height(m) < 0.5 || m.state === 'sink' || m.state === 'bonk') {
      g.misses++; g.combo = 0; g.events.push({ type: 'whiff', hole: i });
      return 'whiff';
    }
    if (m.kind === 'bomb') {
      g.lives--; g.bombs++; g.combo = 0; m.state = 'bonk'; m.t = 0;
      g.events.push({ type: 'boom', hole: i });
      return 'boom';
    }
    m.hp--;
    if (m.hp > 0) { g.events.push({ type: 'clang', hole: i }); m.t = Math.min(m.t, m.stay * 0.4); return 'clang'; }
    g.combo++; g.best = Math.max(g.best, g.combo); g.hits++;
    // Ten hits in a row without a miss doubles the points.
    const mult = g.combo >= 10 ? 2 : 1;
    const pts = POINTS[m.kind] * mult;
    g.score += pts;
    m.state = 'bonk'; m.t = 0;
    g.events.push({ type: 'hit', hole: i, kind: m.kind, pts, mult });
    return 'hit';
  }

  function result(g) {
    const goal = g.cfg.goal;
    const stars = g.lives <= 0 ? 0 : g.score >= goal * 1.6 ? 3 : g.score >= goal * 1.3 ? 2 : g.score >= goal ? 1 : 0;
    return { score: g.score, goal, stars, hits: g.hits, escaped: g.escaped, bombs: g.bombs, best: g.best, lives: g.lives };
  }

  root.WAM = { HOLES, HIT_RADIUS, LEVELS, POINTS, LIVES, createRound, step, smash, height, holeAt, result };
})(typeof window !== 'undefined' ? window : globalThis);
