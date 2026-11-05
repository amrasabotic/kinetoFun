// Fire Brigade rules: building, fires, water, pets, shifts and scoring. No drawing, so it runs headless in tests.
(function (root) {
  // Building area in 1280x720 stage pixels; rooms split it into a grid.
  const AREA = { x: 300, y: 110, w: 680, h: 500 };
  const MAX_DAMAGE = 100;

  // cols x floors, fire starts, seconds between starts, how fast fires grow and spread, pets, tank seconds of spray.
  const LEVELS = [
    { name: 'First call', cols: 2, floors: 2, starts: 6, gap: 6, grow: 0.1, spread: 0, max: 2, pets: 1, tank: 9 },
    { name: 'Corner shop', cols: 3, floors: 2, starts: 9, gap: 5, grow: 0.12, spread: 0.06, max: 2, pets: 2, tank: 9 },
    { name: 'Apartments', cols: 3, floors: 3, starts: 11, gap: 4.5, grow: 0.13, spread: 0.1, max: 3, pets: 2, tank: 8 },
    { name: 'School', cols: 4, floors: 3, starts: 13, gap: 4, grow: 0.14, spread: 0.12, max: 3, pets: 3, tank: 8 },
    { name: 'Windy day', cols: 4, floors: 3, starts: 13, gap: 3.8, grow: 0.15, spread: 0.2, max: 3, pets: 3, tank: 8 },
    { name: 'Bakery', cols: 4, floors: 4, starts: 15, gap: 3.5, grow: 0.14, spread: 0.16, max: 3, pets: 4, tank: 7 },
    { name: 'Hotel', cols: 5, floors: 4, starts: 17, gap: 3.2, grow: 0.16, spread: 0.18, max: 4, pets: 4, tank: 7 },
    { name: 'Low water', cols: 4, floors: 4, starts: 16, gap: 3.4, grow: 0.14, spread: 0.16, max: 3, pets: 4, tank: 4.5 },
    { name: 'Factory', cols: 5, floors: 4, starts: 19, gap: 3.1, grow: 0.15, spread: 0.18, max: 4, pets: 5, tank: 6.5 },
    { name: 'Skyscraper', cols: 5, floors: 5, starts: 22, gap: 2.8, grow: 0.16, spread: 0.18, max: 4, pets: 6, tank: 6.5 },
  ];

  const SPRAY = 0.6;        // fire put out per second by one hose on its room
  const REFILL = 2.2;        // tank refills this many times faster than it drains
  const SPREAD_AT = 0.5;     // a fire this big can jump to a neighbouring room
  const DAMAGE_RATE = 1.4;   // damage per second from a room at full blaze
  const RESCUE_S = 1.4;      // hold the hose on a pet this long to bring it down
  const RESCUE_FIRE = 0.35;  // the ladder goes up only once the room's fire is this small
  const PET_WAIT = 26;       // seconds a pet waits before it gets out on its own

  function rng(seed) {
    let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function roomRect(cfg, i) {
    const c = i % cfg.cols, f = Math.floor(i / cfg.cols), w = AREA.w / cfg.cols, h = AREA.h / cfg.floors;
    return { x: AREA.x + c * w, y: AREA.y + AREA.h - (f + 1) * h, w, h };
  }
  function roomAt(g, x, y) {
    const { cols, floors } = g.cfg;
    if (x < AREA.x || x >= AREA.x + AREA.w || y < AREA.y || y >= AREA.y + AREA.h) return -1;
    const c = Math.floor((x - AREA.x) / (AREA.w / cols)), f = floors - 1 - Math.floor((y - AREA.y) / (AREA.h / floors));
    return f * cols + c;
  }
  function neighbours(cfg, i) {
    const c = i % cfg.cols, f = Math.floor(i / cfg.cols), out = [];
    if (c > 0) out.push(i - 1);
    if (c < cfg.cols - 1) out.push(i + 1);
    if (f > 0) out.push(i - cfg.cols);
    if (f < cfg.floors - 1) out.push(i + cfg.cols);
    return out;
  }

  function createRound(level, opts = {}) {
    const cfg = LEVELS[level], n = cfg.cols * cfg.floors;
    return {
      level, cfg, t: 0, over: false, damage: 0, score: 0, started: 0, out: 0, saved: 0, missed: 0, petsShown: 0,
      fire: Array(n).fill(0), pets: [], next: 1.5, petNext: 6,
      hoses: [0, 1].map(() => ({ tank: 1, on: false, room: -1, pet: null, hold: 0 })),
      random: opts.seed != null ? rng(opts.seed) : Math.random, events: [],
    };
  }

  function ignite(g) {
    const free = g.fire.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (!free.length) return;
    const i = free[Math.floor(g.random() * free.length)];
    g.fire[i] = 0.2; g.started++;
    g.events.push({ type: 'ignite', room: i });
  }

  // A pet shows up in a burning room, starting a fire there if none is burning, so that fire has to go first.
  function placePet(g) {
    const busy = new Set(g.pets.map((p) => p.room));
    let pool = g.fire.map((v, i) => (v > 0 && !busy.has(i) ? i : -1)).filter((i) => i >= 0);
    if (!pool.length) {
      const cold = g.fire.map((v, i) => (!v && !busy.has(i) ? i : -1)).filter((i) => i >= 0);
      if (!cold.length) return false;
      const i = cold[Math.floor(g.random() * cold.length)];
      g.fire[i] = 0.4;
      g.events.push({ type: 'ignite', room: i });
      pool = [i];
    }
    const room = pool[Math.floor(g.random() * pool.length)];
    g.pets.push({ room, t: 0, kind: g.petsShown % 4, rescue: 0 });
    g.petsShown++;
    g.events.push({ type: 'pet', room });
    return true;
  }

  const stillToCome = (g) => g.started < g.cfg.starts || g.petsShown < g.cfg.pets;

  // hoses: [{ x, y, on }] in stage pixels, one per player; a missing hand is { on: false }.
  function step(g, dt, input = []) {
    if (g.over) return;
    g.t += dt;
    const { cfg } = g;
    // New fires wait while the shift's limit of rooms is already burning, so the building never snowballs out of reach.
    const burning = () => g.fire.filter((v) => v > 0).length;
    g.next -= dt;
    if (g.next <= 0 && g.started < cfg.starts && burning() < cfg.max) { ignite(g); g.next = cfg.gap; }
    g.petNext -= dt;
    if (g.petNext <= 0 && g.petsShown < cfg.pets) g.petNext = placePet(g) ? cfg.starts * cfg.gap / (cfg.pets + 1) : 1;

    g.hoses.forEach((h, k) => {
      const inp = input[k] || {};
      const room = inp.x != null ? roomAt(g, inp.x, inp.y) : -1;
      const want = !!inp.on && inp.x != null;
      // An empty tank stops the water until it has refilled a little, so it cannot flicker on and off.
      if (h.tank <= 0) h.dry = true;
      if (h.dry && h.tank >= 0.25) h.dry = false;
      h.on = want && !h.dry;
      h.room = room;
      if (h.on) h.tank = Math.max(0, h.tank - dt / cfg.tank);
      else h.tank = Math.min(1, h.tank + (REFILL * dt) / cfg.tank);
      if (h.on && room >= 0 && g.fire[room] > 0) {
        g.fire[room] = Math.max(0, g.fire[room] - SPRAY * dt);
        if (!g.fire[room]) { g.out++; g.score += 20; g.events.push({ type: 'out', room }); }
      }
      // Rescue: rest the hose on a pet's window once its fire is small.
      const pet = g.pets.find((p) => p.room === room);
      if (pet && g.fire[room] <= RESCUE_FIRE) {
        pet.rescue += dt;
        if (pet.rescue >= RESCUE_S) {
          g.pets.splice(g.pets.indexOf(pet), 1);
          g.saved++; g.score += 50 + Math.round(30 * Math.max(0, 1 - pet.t / PET_WAIT));
          g.events.push({ type: 'saved', room, kind: pet.kind, hose: k });
        }
      }
    });
    for (const p of g.pets) if (!g.hoses.some((h) => h.room === p.room)) p.rescue = Math.max(0, p.rescue - dt);

    // Fires grow, spread to neighbours and do damage.
    const spreadTo = [];
    g.fire.forEach((v, i) => {
      if (!v) return;
      const sprayed = g.hoses.some((h) => h.on && h.room === i);
      if (!sprayed) g.fire[i] = Math.min(1, v + cfg.grow * dt);
      if (g.fire[i] >= SPREAD_AT && !sprayed && g.random() < cfg.spread * dt) {
        const cold = neighbours(cfg, i).filter((j) => !g.fire[j]);
        if (cold.length) spreadTo.push(cold[Math.floor(g.random() * cold.length)]);
      }
      g.damage += DAMAGE_RATE * g.fire[i] * g.fire[i] * dt;
    });
    for (const j of spreadTo) if (!g.fire[j] && burning() <= cfg.max) { g.fire[j] = 0.15; g.events.push({ type: 'spread', room: j }); }

    for (let k = g.pets.length - 1; k >= 0; k--) {
      const p = g.pets[k];
      p.t += dt;
      if (p.t >= PET_WAIT) { g.pets.splice(k, 1); g.missed++; g.events.push({ type: 'missed', room: p.room, kind: p.kind }); }
    }

    if (g.damage >= MAX_DAMAGE) { g.damage = MAX_DAMAGE; g.over = true; g.events.push({ type: 'over', lost: true }); return; }
    // A shift is done when every fire has started and is out and every pet has come down.
    if (!stillToCome(g) && g.fire.every((v) => !v) && !g.pets.length) { g.over = true; g.events.push({ type: 'over', lost: false }); }
  }

  function result(g) {
    const passed = g.damage < MAX_DAMAGE;
    const left = Math.round(MAX_DAMAGE - g.damage);
    const total = passed ? g.score + left * 3 : g.score;
    const stars = !passed ? 0 : g.missed === 0 && g.damage < 4 ? 3 : g.damage < 15 && g.missed <= 1 ? 2 : 1;
    return { score: total, stars, passed, saved: g.saved, missed: g.missed, pets: g.cfg.pets, out: g.out, damage: Math.round(g.damage), time: Math.round(g.t) };
  }

  root.BRIGADE = {
    AREA, MAX_DAMAGE, LEVELS, SPRAY, RESCUE_S, RESCUE_FIRE, PET_WAIT,
    roomRect, roomAt, neighbours, createRound, step, result,
  };
})(typeof window !== 'undefined' ? window : globalThis);
