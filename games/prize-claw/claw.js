// Claw machine rules, free of rendering and input, so grabbing and level balance can run headless.
// Machine space: x 0..1000 left to right, y 0..600 top to bottom; the prize chute is at the left.
(function (root) {
  const M = { w: 1000, floor: 560, top: 70, chuteX: 70, wall: 150, left: 160, right: 985 };
  const SPEED = { move: 520, drop: 360, lift: 300, carry: 420, close: 0.45, open: 0.4 };
  const TIP = 46;

  const KINDS = {
    bear:  { name: 'Teddy Bear', r: 46, weight: 1.0, value: 30 },
    duck:  { name: 'Duck',       r: 36, weight: 0.8, value: 20 },
    ball:  { name: 'Ball',       r: 32, weight: 0.9, value: 15 },
    robot: { name: 'Robot',      r: 40, weight: 1.15, value: 40 },
    dino:  { name: 'Dino',       r: 44, weight: 1.1, value: 35 },
    star:  { name: 'Star',       r: 34, weight: 0.85, value: 25 },
    crown: { name: 'Golden Crown', r: 34, weight: 1.2, value: 100, golden: true },
  };

  // prizes: [kind, x]; stacked prizes are placed in order and rest on what is below them.
  const LEVELS = [
    { name: 'Teddy Time', tries: 5, goal: 1, strength: 1.0, prizes: [['bear', 330], ['bear', 560], ['bear', 790]] },
    { name: 'Duck Pond', tries: 6, goal: 2, strength: 0.95, prizes: [['duck', 260], ['duck', 420], ['ball', 580], ['duck', 740], ['duck', 900]] },
    { name: 'Toy Pile', tries: 6, goal: 2, strength: 0.95, prizes: [['bear', 480], ['ball', 560], ['duck', 640], ['star', 520], ['duck', 600], ['ball', 300], ['star', 860]] },
    { name: 'Swinging Claw', tries: 6, goal: 2, strength: 0.95, swing: { a: 40, w: 2.2 }, prizes: [['dino', 300], ['star', 500], ['dino', 700], ['duck', 880]] },
    { name: 'The Golden Crown', tries: 6, goal: 1, golden: true, strength: 0.95, prizes: [['bear', 280], ['crown', 520], ['ball', 680], ['bear', 860]] },
    { name: 'Robot Party', tries: 7, goal: 3, strength: 0.9, swing: { a: 55, w: 2.4 }, prizes: [['robot', 260], ['ball', 400], ['robot', 540], ['star', 680], ['robot', 820], ['duck', 940]] },
    { name: 'Conveyor Belt', tries: 6, goal: 2, strength: 0.95, belt: 32, prizes: [['duck', 240], ['star', 420], ['bear', 600], ['ball', 780], ['dino', 940]] },
    { name: 'Swing and Slide', tries: 6, goal: 2, strength: 0.92, belt: 28, swing: { a: 40, w: 2.2 }, prizes: [['star', 260], ['robot', 470], ['duck', 680], ['star', 880]] },
    { name: 'Heavy Treasure', tries: 7, goal: 1, golden: true, strength: 0.85, prizes: [['robot', 420], ['dino', 500], ['crown', 460], ['robot', 760], ['dino', 860]] },
    { name: 'The Big Jackpot', tries: 9, goal: 3, strength: 0.9, belt: 28, swing: { a: 45, w: 2.3 }, prizes: [['bear', 250], ['crown', 430], ['robot', 600], ['dino', 780], ['star', 930]] },
  ];

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

  // Lowest resting height for a prize at x: the floor, or the top of a prize it overlaps.
  function restY(prizes, x, r, self) {
    let y = M.floor - r;
    for (const p of prizes) {
      if (p === self || p.held || p.falling) continue;
      const dx = Math.abs(p.x - x);
      if (dx >= p.r + r) continue;
      y = Math.min(y, p.y - Math.sqrt((p.r + r) ** 2 - dx * dx));
    }
    return y;
  }

  function createGame(levelIndex, seed) {
    const lv = LEVELS[levelIndex];
    const g = {
      level: levelIndex, t: 0, tries: lv.tries, won: [], misses: 0, events: [], over: null, rand: rng(seed || 77 + levelIndex),
      claw: { x: 560, y: M.top, state: 'aim', timer: 0, open: 1, prize: null, slipAt: -1, liftT: 0 },
      prizes: [], uid: 1,
    };
    for (const [kind, x] of lv.prizes) {
      const k = KINDS[kind];
      const p = { id: g.uid++, kind, x, r: k.r, y: 0, vy: 0, held: false, falling: false };
      p.y = restY(g.prizes, x, p.r, p);
      g.prizes.push(p);
    }
    return g;
  }

  // Where the claw really is: the swing adds a sway that the player has to time.
  function clawX(g) {
    const s = LEVELS[g.level].swing;
    return g.claw.x + (s ? s.a * Math.sin(g.t * s.w) : 0);
  }

  function gripChance(g, p, x) {
    const lv = LEVELS[g.level];
    const off = Math.min(1, Math.abs(x - p.x) / p.r);
    // Each miss makes the claw a little stronger, so a child is never stuck on one prize.
    const help = Math.min(0.3, g.misses * 0.1);
    return Math.max(0.05, Math.min(0.97, (lv.strength * (1 - 0.85 * off * off)) / KINDS[p.kind].weight + help));
  }

  function prizeUnderClaw(g, x, tipY) {
    let best = null;
    for (const p of g.prizes) {
      if (p.held || p.falling || Math.abs(x - p.x) > p.r * 0.95) continue;
      if (tipY < p.y - p.r) continue;
      if (!best || p.y < best.y) best = p;
    }
    return best;
  }

  function drop(g) {
    if (g.over || g.claw.state !== 'aim' || g.tries <= 0) return false;
    g.tries--;
    g.claw.state = 'drop';
    g.claw.dropX = clawX(g);
    g.events.push({ type: 'drop' });
    return true;
  }

  function goalMet(g) {
    const lv = LEVELS[g.level];
    return lv.golden ? g.won.some((k) => KINDS[k].golden) : g.won.length >= lv.goal;
  }

  function step(g, dt, targetX) {
    if (g.over) return;
    g.t += dt;
    const lv = LEVELS[g.level], c = g.claw;

    if (lv.belt) {
      for (const p of g.prizes) {
        if (p.held || p.falling) continue;
        p.x += lv.belt * dt;
        if (p.x > M.right - p.r) p.x = M.left + p.r;
      }
    }

    if (c.state === 'aim') {
      const want = Math.max(M.left + 20, Math.min(M.right - 20, targetX));
      const d = want - c.x, maxStep = SPEED.move * dt;
      c.x += Math.abs(d) < maxStep ? d : Math.sign(d) * maxStep;
      c.open = Math.min(1, c.open + dt / SPEED.open);
    } else if (c.state === 'drop') {
      c.y += SPEED.drop * dt;
      const x = c.dropX;
      const hit = prizeUnderClaw(g, x, c.y + TIP);
      if (hit || c.y + TIP >= M.floor) {
        if (hit) c.y = hit.y - hit.r - TIP + hit.r * 0.6;
        c.state = 'close'; c.timer = SPEED.close; c.target = hit;
      }
    } else if (c.state === 'close') {
      c.timer -= dt;
      c.open = Math.max(0, c.timer / SPEED.close);
      if (c.timer <= 0) {
        const p = c.target;
        if (p && !p.held && Math.abs(c.dropX - p.x) <= p.r * 0.95) {
          p.held = true; c.prize = p;
          const ok = g.rand() < gripChance(g, p, c.dropX);
          c.slipAt = ok ? -1 : 0.15 + g.rand() * 0.6;
          g.events.push({ type: 'grab', kind: p.kind });
        } else {
          g.misses++;
          g.events.push({ type: 'empty' });
        }
        c.state = 'lift'; c.liftFrom = c.y; c.liftT = 0;
      }
    } else if (c.state === 'lift') {
      c.y = Math.max(M.top, c.y - SPEED.lift * dt);
      const progress = 1 - (c.y - M.top) / Math.max(1, c.liftFrom - M.top);
      if (c.prize && c.slipAt >= 0 && progress >= c.slipAt) slip(g);
      if (c.y <= M.top) c.state = c.prize ? 'carry' : 'return';
    } else if (c.state === 'carry') {
      c.dropX = Math.max(M.chuteX, c.dropX - SPEED.carry * dt);
      if (c.dropX <= M.chuteX) { c.state = 'release'; c.timer = SPEED.open; }
    } else if (c.state === 'release') {
      c.timer -= dt;
      c.open = 1 - Math.max(0, c.timer / SPEED.open);
      if (c.prize && c.open > 0.4) {
        const p = c.prize;
        g.prizes = g.prizes.filter((q) => q !== p);
        g.won.push(p.kind);
        c.prize = null;
        g.misses = 0;
        g.events.push({ type: 'win', kind: p.kind });
      }
      if (c.timer <= 0) { c.state = 'return'; c.x = M.chuteX; }
    } else if (c.state === 'return') {
      c.y = M.top;
      const d = 560 - c.x, maxStep = SPEED.carry * dt;
      c.x += Math.abs(d) < maxStep ? d : Math.sign(d) * maxStep;
      c.open = Math.min(1, c.open + dt / SPEED.open);
      if (Math.abs(d) < 1) c.state = 'aim';
    }

    if (c.prize) { c.prize.x = c.dropX; c.prize.y = c.y + TIP + c.prize.r * 0.4; }

    for (const p of g.prizes) {
      if (!p.falling) continue;
      p.vy += 1600 * dt; p.y += p.vy * dt;
      if (p.x < M.wall) {
        if (p.y > M.floor) { g.prizes = g.prizes.filter((q) => q !== p); g.won.push(p.kind); g.misses = 0; g.events.push({ type: 'win', kind: p.kind, lucky: true }); }
        continue;
      }
      const rest = restY(g.prizes, p.x, p.r, p);
      if (p.y >= rest) { p.y = rest; p.vy = 0; p.falling = false; g.events.push({ type: 'land' }); }
    }

    const busy = c.state !== 'aim' || g.prizes.some((p) => p.falling);
    if (goalMet(g) && !busy) { g.over = 'win'; g.events.push({ type: 'over', win: true }); }
    else if (g.tries <= 0 && !busy) { g.over = 'out'; g.events.push({ type: 'over', win: false }); }
  }

  function slip(g) {
    const p = g.claw.prize;
    p.held = false; p.falling = true; p.vy = 0;
    g.claw.prize = null; g.misses++;
    g.events.push({ type: 'slip', kind: p.kind });
  }

  function result(g) {
    const lv = LEVELS[g.level], met = goalMet(g);
    const stars = !met ? 1 : g.tries >= Math.ceil(lv.tries / 3) ? 3 : 2;
    const value = g.won.reduce((v, k) => v + KINDS[k].value, 0);
    return { stars, met, won: g.won.slice(), score: value + (met ? 50 + g.tries * 15 : 0) };
  }

  root.Claw = { M, TIP, KINDS, LEVELS, createGame, step, drop, clawX, gripChance, result };
})(typeof window !== 'undefined' ? window : globalThis);
