// Traffic Controller rules: lights, queues, pedestrians, shifts and scoring. No drawing, so it runs headless in tests.
(function (root) {
  const DIRS = ['n', 's', 'e', 'w'];
  const AXIS = { n: 'ns', s: 'ns', e: 'ew', w: 'ew' };
  // Lights go green -> amber -> all red -> next green, like a real junction, so flipping back and forth costs time.
  const AMBER = 1.2, CLEAR = 0.6;
  // Seconds between cars leaving one lane while green; buses are slower to move off.
  const HEADWAY = 0.9, BUS_HEADWAY = 1.8;
  const CROSS = 1.8, WALK_TIME = 4;
  const MAX_QUEUE = 8;
  const STRIKES = 3;

  // rate: cars per second per lane at the start, rising to rate*rush by the end; bias: share of traffic on the north-south road.
  const LEVELS = [
    { name: 'Quiet street', time: 60, rate: 0.13, rush: 1.3, bias: 0.5, peds: 0, amb: 0, bus: 0 },
    { name: 'School crossing', time: 70, rate: 0.14, rush: 1.3, bias: 0.5, peds: 14, amb: 0, bus: 0 },
    { name: 'Morning rush', time: 75, rate: 0.18, rush: 1.4, bias: 0.5, peds: 16, amb: 0, bus: 0 },
    { name: 'Siren!', time: 75, rate: 0.17, rush: 1.4, bias: 0.5, peds: 16, amb: 18, bus: 0 },
    { name: 'Bus route', time: 80, rate: 0.15, rush: 1.4, bias: 0.5, peds: 15, amb: 0, bus: 0.18 },
    { name: 'Main road', time: 80, rate: 0.19, rush: 1.4, bias: 0.72, peds: 15, amb: 22, bus: 0.1 },
    { name: 'Market day', time: 85, rate: 0.165, rush: 1.5, bias: 0.5, peds: 9, amb: 0, bus: 0.12 },
    { name: 'Busy evening', time: 90, rate: 0.175, rush: 1.4, bias: 0.38, peds: 13, amb: 20, bus: 0.12 },
    { name: 'Stadium crowd', time: 90, rate: 0.17, rush: 1.4, bias: 0.6, peds: 10, amb: 18, bus: 0.15 },
    { name: 'Grand junction', time: 100, rate: 0.175, rush: 1.45, bias: 0.5, peds: 13, amb: 20, bus: 0.15 },
  ];
  // The goal is most of the traffic a shift brings (a bus counts as three), so a few slow switches are forgiven but a stuck light is not.
  for (const c of LEVELS) c.goal = Math.round(0.8 * c.rate * 4 * c.time * (1 + c.rush) / 2 * (1 + 2 * c.bus) * 0.97);
  const POINTS = { car: 10, bus: 30, amb: 40, ped: 15 };
  // A car that waits longer than this earns no tip; an ambulance kept waiting this long is a strike.
  const TIP_WAIT = 8, AMB_WAIT = 9, PED_WAIT = 14;
  // A driver kept at the front of a red light this long loses patience and runs it.
  const RUN_RED = 18;

  // Stage layout in 1280x720 pixels: the junction centre and road half-width.
  const CX = 640, CY = 380, HALF = 70;
  const WALK_BTN = { x: 1110, y: 600, r: 85 };

  function rng(seed) {
    let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function createRound(level, opts = {}) {
    const cfg = LEVELS[level];
    return {
      level, cfg, t: 0, over: false, score: 0, strikes: 0, passed: 0, peds: 0, jams: 0, ranRed: 0, ambLate: 0, pedLate: 0,
      light: 'red', want: null, lightT: 0, queues: { n: [], s: [], e: [], w: [] }, leave: { n: 0, s: 0, e: 0, w: 0 },
      spawn: { n: 1, s: 2, e: 1.5, w: 2.5 }, crossing: [], walkers: [], waiting: null, pedNext: cfg.peds ? cfg.peds * 0.5 : Infinity,
      ambNext: cfg.amb ? cfg.amb * 0.7 : Infinity, nextId: 1, random: opts.seed != null ? rng(opts.seed) : Math.random, events: [],
    };
  }

  // What a stage point asks for: a road arm (its axis turns green), the walk button, or nothing.
  function zoneAt(x, y) {
    if (Math.hypot(x - WALK_BTN.x, y - WALK_BTN.y) <= WALK_BTN.r + 15) return 'walk';
    const dx = Math.abs(x - CX), dy = Math.abs(y - CY);
    // The middle of the junction belongs to neither road.
    if (dx < HALF && dy < HALF) return null;
    if (dx < HALF + 50 && dy >= HALF) return 'ns';
    if (dy < HALF + 50 && dx >= HALF) return 'ew';
    return null;
  }

  // Ask for a phase: 'ns', 'ew' or 'walk'. The current green goes amber, then all red, then the new one.
  function request(g, phase) {
    if (g.over || !phase) return false;
    if (g.light === phase && !g.want) return false;
    if (g.want === phase) return false;
    if (phase === 'walk' && !g.waiting && !g.walkers.length) { g.events.push({ type: 'nobody' }); return false; }
    g.want = phase;
    if (g.light === 'red') { g.light = 'clear'; g.lightT = 0; }
    else if (g.light !== 'amber' && g.light !== 'clear') { g.light = 'amber'; g.lightT = 0; }
    g.events.push({ type: 'switch', to: phase });
    return true;
  }

  function strike(g, why) {
    g.strikes++;
    g.events.push({ type: 'strike', why });
    if (g.strikes >= STRIKES) end(g);
  }
  function end(g) { if (!g.over) { g.over = true; g.events.push({ type: 'over' }); } }

  function addCar(g, d, kind) {
    const q = g.queues[d];
    if (kind === 'amb') { q.unshift({ id: g.nextId++, kind, wait: 0 }); g.events.push({ type: 'siren', dir: d }); }
    else q.push({ id: g.nextId++, kind, wait: 0 });
    if (q.length > MAX_QUEUE) {
      // The queue backs out of town: a strike, and the back car gives up.
      q.pop(); g.jams++;
      g.events.push({ type: 'jam', dir: d });
      strike(g, 'jam');
    }
  }

  function step(g, dt) {
    if (g.over) return;
    const c = g.cfg;
    g.t += dt;
    g.lightT += dt;
    if (g.light === 'amber' && g.lightT >= AMBER) { g.light = 'clear'; g.lightT = 0; }
    if (g.light === 'clear' && g.lightT >= CLEAR && !g.crossing.some((x) => x.t < 0.5) && !g.walkers.length) {
      g.light = g.want || 'red'; g.want = null; g.lightT = 0;
      if (g.light === 'walk' && g.waiting) { g.walkers.push({ ...g.waiting, t: 0 }); g.waiting = null; }
      g.events.push({ type: 'green', to: g.light });
    }
    if (g.light === 'walk' && !g.walkers.length && !g.want) { g.light = 'red'; g.lightT = 0; }

    // New traffic, busier as the shift goes on.
    const rush = 1 + (c.rush - 1) * Math.min(1, g.t / c.time);
    for (const d of DIRS) {
      g.spawn[d] -= dt;
      if (g.spawn[d] > 0) continue;
      const share = AXIS[d] === 'ns' ? c.bias : 1 - c.bias;
      const rate = c.rate * rush * share * 2;
      g.spawn[d] = (0.6 + g.random() * 0.8) / rate;
      if (g.t < c.time - 2) addCar(g, d, g.random() < c.bus ? 'bus' : 'car');
      if (g.over) return;
    }
    g.ambNext -= dt;
    if (g.ambNext <= 0) { g.ambNext = c.amb * (0.8 + g.random() * 0.5); if (g.t < c.time - 8) addCar(g, DIRS[Math.floor(g.random() * 4)], 'amb'); }
    g.pedNext -= dt;
    if (g.pedNext <= 0) {
      g.pedNext = c.peds * (0.8 + g.random() * 0.5);
      if (!g.waiting && g.t < c.time - 8) { g.waiting = { id: g.nextId++, n: 2 + Math.floor(g.random() * 4), wait: 0 }; g.events.push({ type: 'peds' }); }
    }

    for (const d of DIRS) for (const car of g.queues[d]) car.wait += dt;
    for (const d of DIRS) {
      const q = g.queues[d], front = q[0];
      if (front && front.kind === 'amb' && front.wait >= AMB_WAIT && !front.late) { front.late = true; g.ambLate++; strike(g, 'ambulance'); if (g.over) return; }
      else if (front && front.kind !== 'amb' && front.wait >= RUN_RED && g.light !== AXIS[d]) {
        q.shift(); g.ranRed++;
        g.events.push({ type: 'ranred', dir: d });
        strike(g, 'ranred'); if (g.over) return;
      }
    }
    if (g.waiting) {
      g.waiting.wait += dt;
      if (g.waiting.wait >= PED_WAIT) { g.pedLate++; g.waiting = null; g.events.push({ type: 'pedgiveup' }); strike(g, 'peds'); if (g.over) return; }
    }

    // Green lanes let one car go at a time.
    for (const d of DIRS) {
      g.leave[d] -= dt;
      if (g.light !== AXIS[d] || !g.queues[d].length || g.leave[d] > 0) continue;
      const car = g.queues[d].shift();
      g.leave[d] = car.kind === 'bus' ? BUS_HEADWAY : HEADWAY;
      g.crossing.push({ ...car, dir: d, t: 0 });
    }
    g.crossing = g.crossing.filter((car) => {
      car.t += dt / (car.kind === 'bus' ? CROSS * 1.4 : CROSS);
      if (car.t < 1) return true;
      const tip = car.kind === 'car' && car.wait < TIP_WAIT ? 5 : 0;
      const pts = POINTS[car.kind] + tip;
      g.score += pts; g.passed += car.kind === 'bus' ? 3 : 1;
      g.events.push({ type: 'pass', kind: car.kind, dir: car.dir, pts });
      return false;
    });
    g.walkers = g.walkers.filter((w) => {
      w.t += dt / WALK_TIME;
      if (w.t < 1) return true;
      g.score += POINTS.ped * w.n; g.peds += w.n;
      g.events.push({ type: 'walked', n: w.n, pts: POINTS.ped * w.n });
      return false;
    });
    if (g.t >= c.time) end(g);
  }

  function result(g) {
    const goal = g.cfg.goal, ok = g.strikes < STRIKES && g.passed >= goal;
    const stars = !ok ? 0 : g.strikes === 0 && g.passed >= goal * 1.15 ? 3 : g.strikes <= 1 && g.passed >= goal * 1.06 ? 2 : 1;
    return { score: g.score, passed: g.passed, goal, peds: g.peds, strikes: g.strikes, stars, ok, jams: g.jams, ranRed: g.ranRed, ambLate: g.ambLate, pedLate: g.pedLate };
  }

  root.TRAFFIC = { DIRS, AXIS, LEVELS, POINTS, STRIKES, MAX_QUEUE, AMB_WAIT, PED_WAIT, TIP_WAIT, RUN_RED, CX, CY, HALF, WALK_BTN, createRound, step, request, zoneAt, result };
})(typeof window !== 'undefined' ? window : globalThis);
