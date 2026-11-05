// Sea, boats and light, free of rendering and input, so steering and level layouts can be tested headless.
// The sea is 1280 x 720; boats come in from the top and the harbour mouth is at the bottom centre.
(function (root) {
  const SEA = { w: 1280, h: 720 };
  const HARBOUR = { x0: 570, x1: 710, y: 668, cx: 640, cy: 700 };
  const BOAT_R = 18;
  const LIGHT = { clear: 180, fog: 115 };
  const MOVE = { speed: 85, turn: 2.6, accel: 120, sailIn: 30 };

  // The coast is a row of rocks either side of the harbour mouth.
  const COAST = [];
  for (let x = 20; x <= 540; x += 48) COAST.push([x, 702, 32]);
  for (let x = 740; x <= 1260; x += 48) COAST.push([x, 702, 32]);

  // Buoys mark a safe channel: from where boats appear, buoy to buoy, into the harbour.
  const LEVELS = [
    { name: 'Calm Night', spawns: [[1, 640]], buoys: [[640, 400]],
      rocks: [[420, 330, 44], [860, 310, 48]] },
    { name: 'Two Little Boats', spawns: [[1, 380], [10, 900]], buoys: [[640, 470]],
      rocks: [[640, 250, 52], [300, 560, 40], [980, 560, 40]] },
    { name: 'Rocky Bay', spawns: [[1, 300], [12, 300]], buoys: [[300, 300], [560, 420], [640, 560]],
      rocks: [[520, 220, 50], [180, 470, 46], [820, 330, 56], [420, 560, 40], [860, 560, 46]] },
    { name: 'Into the Fog', fog: true, spawns: [[1, 900], [12, 400]], buoys: [[640, 380], [640, 560]],
      rocks: [[440, 280, 46], [880, 300, 46], [440, 500, 42], [840, 500, 42]] },
    { name: 'Whale Watch', spawns: [[1, 640], [11, 640]], buoys: [[640, 300], [640, 560]],
      rocks: [[380, 380, 50], [900, 380, 50]],
      whales: [{ a: [300, 450], b: [980, 450], speed: 70, r: 40 }] },
    { name: 'Busy Harbour', spawns: [[1, 260], [3, 1020], [9, 640], [14, 420]], buoys: [[640, 420]],
      rocks: [[200, 200, 40], [1080, 200, 40], [300, 420, 46], [980, 420, 46], [460, 590, 34], [820, 590, 34]] },
    { name: 'Storm Current', current: 26, spawns: [[1, 400], [10, 400], [18, 400]], buoys: [[400, 280], [640, 470]],
      rocks: [[700, 230, 52], [200, 450, 46], [920, 420, 52], [420, 560, 34]] },
    { name: 'Fog and Whales', fog: true, spawns: [[1, 640], [10, 640], [19, 640]], buoys: [[640, 280], [640, 560]],
      rocks: [[400, 220, 46], [880, 220, 46], [420, 600, 30], [860, 600, 30]],
      whales: [{ a: [260, 420], b: [1020, 420], speed: 60, r: 40 }] },
    { name: 'Narrow Passage', spawns: [[1, 220], [11, 220], [21, 220]], buoys: [[240, 260], [640, 260], [640, 560]],
      rocks: [[440, 150, 48], [440, 380, 60], [840, 380, 60], [240, 470, 44], [1040, 470, 44], [1040, 230, 46]] },
    { name: 'The Grand Regatta', current: 18, spawns: [[1, 300], [4, 980], [10, 640], [15, 300], [20, 980], [26, 640]], buoys: [[640, 330], [640, 560]],
      rocks: [[300, 200, 42], [980, 200, 42], [420, 430, 46], [860, 430, 46]],
      whales: [{ a: [200, 560], b: [480, 560], speed: 45, r: 34 }, { a: [800, 560], b: [1080, 560], speed: 45, r: 34 }] },
  ];

  function createGame(levelIndex) {
    const lv = LEVELS[levelIndex];
    return {
      level: levelIndex, t: 0, saved: 0, bumps: 0, total: lv.spawns.length, next: 0, uid: 1,
      boats: [], whales: (lv.whales || []).map((w) => ({ ...w, x: w.a[0], y: w.a[1], dir: 1, p: 0 })),
      rocks: lv.rocks.concat(COAST), events: [], over: false,
    };
  }

  const lightRadius = (g) => (LEVELS[g.level].fog ? LIGHT.fog : LIGHT.clear);

  function bump(g, b, ox, oy, r) {
    const dx = b.x - ox, dy = b.y - oy, d = Math.hypot(dx, dy) || 1;
    b.x = ox + (dx / d) * (r + BOAT_R + 2);
    b.y = oy + (dy / d) * (r + BOAT_R + 2);
    b.h = Math.atan2(dy, dx);
    b.v = 25;
    if (b.stun <= 0) { g.bumps++; g.events.push({ type: 'bump', id: b.id, x: b.x, y: b.y }); }
    b.stun = 0.8;
  }

  // spot: where the beam points, or null when there is no hand.
  function step(g, dt, spot) {
    if (g.over) return;
    const lv = LEVELS[g.level];
    g.t += dt;
    while (g.next < lv.spawns.length && lv.spawns[g.next][0] <= g.t) {
      const x = lv.spawns[g.next++][1];
      g.boats.push({ id: g.uid++, x, y: -BOAT_R, h: Math.PI / 2, v: MOVE.sailIn, lit: false, stun: 0 });
      g.events.push({ type: 'arrive' });
    }
    for (const w of g.whales) {
      const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      w.p += (w.dir * w.speed * dt) / len;
      if (w.p >= 1) { w.p = 1; w.dir = -1; } else if (w.p <= 0) { w.p = 0; w.dir = 1; }
      w.x = w.a[0] + (w.b[0] - w.a[0]) * w.p; w.y = w.a[1] + (w.b[1] - w.a[1]) * w.p;
    }
    const R = lightRadius(g);
    for (const b of g.boats) {
      b.stun = Math.max(0, b.stun - dt);
      const d = spot ? Math.hypot(spot.x - b.x, spot.y - b.y) : Infinity;
      const wasLit = b.lit;
      b.lit = d < R;
      if (b.lit && !wasLit) g.events.push({ type: 'lit', id: b.id });
      let want;
      if (b.stun > 0) want = 0;
      else if (b.lit) {
        const goal = Math.atan2(spot.y - b.y, spot.x - b.x);
        let turn = goal - b.h;
        while (turn > Math.PI) turn -= 2 * Math.PI;
        while (turn < -Math.PI) turn += 2 * Math.PI;
        b.h += Math.max(-MOVE.turn * dt, Math.min(MOVE.turn * dt, turn));
        want = d < 24 ? 0 : MOVE.speed * Math.min(1, d / 80);
      // Unlit boats sail into view, then drop anchor and wait for the light.
      } else want = b.y < 90 ? MOVE.sailIn : 0;
      b.v += Math.max(-MOVE.accel * dt, Math.min(MOVE.accel * dt, want - b.v));
      // The current only carries boats under way, so anchored boats never drift onto rocks.
      b.x += Math.cos(b.h) * b.v * dt + (b.lit && b.v > 10 ? (lv.current || 0) * dt : 0);
      b.y += Math.sin(b.h) * b.v * dt;
      if (b.x < BOAT_R) { b.x = BOAT_R; b.h = Math.PI - b.h; }
      if (b.x > SEA.w - BOAT_R) { b.x = SEA.w - BOAT_R; b.h = Math.PI - b.h; }
      if (b.y < -BOAT_R) b.y = -BOAT_R;
      for (const [rx, ry, rr] of g.rocks) if (Math.hypot(b.x - rx, b.y - ry) < rr + BOAT_R) bump(g, b, rx, ry, rr);
      for (const w of g.whales) if (Math.hypot(b.x - w.x, b.y - w.y) < w.r + BOAT_R) bump(g, b, w.x, w.y, w.r);
      if (b.x > HARBOUR.x0 && b.x < HARBOUR.x1 && b.y > HARBOUR.y) {
        b.home = true; g.saved++;
        g.events.push({ type: 'home', id: b.id });
      }
    }
    // Boats nudge each other apart instead of overlapping; that is not a bump.
    for (let i = 0; i < g.boats.length; i++) for (let j = i + 1; j < g.boats.length; j++) {
      const a = g.boats[i], c = g.boats[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < BOAT_R * 2) { const push = (BOAT_R * 2 - d) / 2; a.x -= (dx / d) * push; a.y -= (dy / d) * push; c.x += (dx / d) * push; c.y += (dy / d) * push; }
    }
    g.boats = g.boats.filter((b) => !b.home);
    if (g.next >= lv.spawns.length && g.boats.length === 0) { g.over = true; g.events.push({ type: 'over' }); }
  }

  function result(g) {
    const stars = g.bumps === 0 ? 3 : g.bumps <= 2 ? 2 : 1;
    return { stars, bumps: g.bumps, seconds: Math.round(g.t), score: g.saved * 50 + stars * 40 + Math.max(0, 120 - Math.round(g.t)) };
  }

  root.Lighthouse = { SEA, HARBOUR, BOAT_R, LIGHT, COAST, LEVELS, createGame, step, result, lightRadius };
})(typeof window !== 'undefined' ? window : globalThis);
