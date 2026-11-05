// Mix It Up rules: jars, recipes, customers, levels and scoring. No drawing, so it runs headless in tests.
(function (root) {
  const PIGMENTS = {
    r: { name: 'Red', rgb: [226, 40, 42] },
    y: { name: 'Yellow', rgb: [250, 214, 30] },
    b: { name: 'Blue', rgb: [36, 84, 214] },
    w: { name: 'White', rgb: [255, 255, 255] },
    k: { name: 'Black', rgb: [24, 20, 28] },
  };
  const KEYS = ['r', 'y', 'b', 'w', 'k'];
  const MAX_SCOOPS = 4;

  // Each recipe is the smallest scoop count; any multiple of it (2 red + 2 blue for purple) also matches.
  const RECIPES = [
    { id: 'red', name: 'Red', mix: { r: 1 }, tier: 0 },
    { id: 'yellow', name: 'Yellow', mix: { y: 1 }, tier: 0 },
    { id: 'blue', name: 'Blue', mix: { b: 1 }, tier: 0 },
    { id: 'orange', name: 'Orange', mix: { r: 1, y: 1 }, tier: 1 },
    { id: 'green', name: 'Green', mix: { y: 1, b: 1 }, tier: 1 },
    { id: 'purple', name: 'Purple', mix: { r: 1, b: 1 }, tier: 1 },
    { id: 'redorange', name: 'Red-orange', mix: { r: 2, y: 1 }, tier: 2 },
    { id: 'amber', name: 'Amber', mix: { r: 1, y: 2 }, tier: 2 },
    { id: 'lime', name: 'Lime', mix: { y: 2, b: 1 }, tier: 2 },
    { id: 'teal', name: 'Teal', mix: { y: 1, b: 2 }, tier: 2 },
    { id: 'violet', name: 'Violet', mix: { r: 1, b: 2 }, tier: 2 },
    { id: 'magenta', name: 'Magenta', mix: { r: 2, b: 1 }, tier: 2 },
    { id: 'pink', name: 'Pink', mix: { r: 1, w: 1 }, tier: 3 },
    { id: 'sky', name: 'Sky blue', mix: { b: 1, w: 1 }, tier: 3 },
    { id: 'cream', name: 'Cream', mix: { y: 1, w: 1 }, tier: 3 },
    { id: 'lilac', name: 'Lilac', mix: { r: 1, b: 1, w: 1 }, tier: 3 },
    { id: 'mint', name: 'Mint', mix: { y: 1, b: 1, w: 1 }, tier: 3 },
    { id: 'maroon', name: 'Maroon', mix: { r: 1, k: 1 }, tier: 4 },
    { id: 'navy', name: 'Navy', mix: { b: 1, k: 1 }, tier: 4 },
    { id: 'olive', name: 'Olive', mix: { y: 1, k: 1 }, tier: 4 },
    { id: 'grey', name: 'Grey', mix: { w: 1, k: 1 }, tier: 4 },
    { id: 'brown', name: 'Brown', mix: { r: 1, y: 1, b: 1 }, tier: 4 },
    { id: 'peach', name: 'Peach', mix: { r: 1, y: 1, w: 2 }, tier: 5 },
    { id: 'coral', name: 'Coral', mix: { r: 2, y: 1, w: 1 }, tier: 5 },
    { id: 'forest', name: 'Forest', mix: { y: 1, b: 1, k: 1 }, tier: 5 },
    { id: 'plum', name: 'Plum', mix: { r: 1, b: 1, k: 1 }, tier: 5 },
    { id: 'tan', name: 'Tan', mix: { r: 1, y: 1, b: 1, w: 1 }, tier: 5 },
    { id: 'seafoam', name: 'Seafoam', mix: { y: 1, b: 1, w: 2 }, tier: 5 },
  ];

  // tiers: which recipe tiers customers order; jars: which jars are on the shelf; hint: seconds before the recipe is shown (0 = always).
  const LEVELS = [
    { name: 'First brews', tiers: [0], jars: 'ryb', customers: 4, at: 1, patience: 30, hint: 0 },
    { name: 'Two make one', tiers: [1], jars: 'ryb', customers: 5, at: 1, patience: 32, hint: 0 },
    { name: 'Guess the mix', tiers: [0, 1], jars: 'ryb', customers: 6, at: 2, patience: 36, hint: 14 },
    { name: 'Stronger shades', tiers: [1, 2], jars: 'ryb', customers: 6, at: 2, patience: 40, hint: 16 },
    { name: 'Pastels', tiers: [3], jars: 'rybw', customers: 6, at: 2, patience: 34, hint: 16 },
    { name: 'Busy shop', tiers: [1, 2, 3], jars: 'rybw', customers: 8, at: 3, patience: 40, hint: 18 },
    { name: 'Dark shades', tiers: [4], jars: 'rybwk', customers: 7, at: 2, patience: 42, hint: 18 },
    { name: 'Rush hour', tiers: [2, 3, 4], jars: 'rybwk', customers: 9, at: 3, patience: 34, hint: 18 },
    { name: 'Master mixes', tiers: [5], jars: 'rybwk', customers: 7, at: 2, patience: 48, hint: 22 },
    { name: 'Royal ball', tiers: [2, 3, 4, 5], jars: 'rybwk', customers: 10, at: 3, patience: 40, hint: 22 },
  ];
  const HEARTS = 3;

  // Stage layout in 1280x720 pixels; the hand moves across the whole stage.
  const SLOTS = [{ x: 420, y: 230 }, { x: 640, y: 230 }, { x: 860, y: 230 }];
  const JAR_SPOTS = { r: { x: 130, y: 610 }, y: { x: 300, y: 640 }, b: { x: 980, y: 640 }, w: { x: 1150, y: 610 }, k: { x: 1150, y: 440 } };
  const CAULDRON = { x: 640, y: 560 };
  const SINK = { x: 130, y: 440 };
  const R = { slot: 120, jar: 85, cauldron: 140, sink: 85 };

  function rng(seed) {
    let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function reduce(mix) {
    const vals = KEYS.map((k) => mix[k] || 0), g = vals.reduce((a, v) => gcd(a, v), 0);
    const out = {};
    if (!g) return out;
    KEYS.forEach((k, i) => { if (vals[i]) out[k] = vals[i] / g; });
    return out;
  }
  const scoops = (mix) => KEYS.reduce((n, k) => n + (mix[k] || 0), 0);
  function same(a, b) {
    const x = reduce(a), y = reduce(b);
    return KEYS.every((k) => (x[k] || 0) === (y[k] || 0));
  }

  // Painter's colour wheel (red + yellow = orange, yellow + blue = green), then tinted by white and shaded by black.
  const RYB = [[1, 1, 1], [0.95, 0.15, 0.15], [1, 0.85, 0.1], [1, 0.5, 0], [0.16, 0.36, 0.86], [0.55, 0.15, 0.6], [0.1, 0.62, 0.25], [0.3, 0.2, 0.1]];
  function colorOf(mix) {
    const n = scoops(mix);
    if (!n) return [70, 60, 90];
    const r = mix.r || 0, y = mix.y || 0, b = mix.b || 0, hue = r + y + b;
    let rgb;
    if (hue) {
      const m = Math.max(r, y, b), R0 = r / m, Y = y / m, B = b / m;
      rgb = [0, 1, 2].map((c) => {
        const v = (i) => RYB[i][c];
        const x0 = v(0) * (1 - R0) + v(1) * R0, x1 = v(2) * (1 - R0) + v(3) * R0, x2 = v(4) * (1 - R0) + v(5) * R0, x3 = v(6) * (1 - R0) + v(7) * R0;
        return ((x0 * (1 - Y) + x1 * Y) * (1 - B) + (x2 * (1 - Y) + x3 * Y) * B) * 255;
      });
    }
    const w = (mix.w || 0) / n, k = (mix.k || 0) / n, hw = hue / n;
    if (!hue) return [0, 1, 2].map(() => Math.round(255 * w + 24 * k));
    return rgb.map((v, c) => Math.round((v * hw + 255 * w + PIGMENTS.k.rgb[c] * k)));
  }
  const css = (mix) => `rgb(${colorOf(mix).join(',')})`;

  function createRound(level, opts = {}) {
    const cfg = LEVELS[level];
    return {
      level, cfg, t: 0, over: false, coins: 0, hearts: HEARTS, served: 0, lost: 0, wrong: 0, spawned: 0, perfect: 0,
      slots: SLOTS.map(() => null), cauldron: {}, held: null, next: 0.5, lastRecipe: null,
      random: opts.seed != null ? rng(opts.seed) : Math.random, events: [],
    };
  }

  function pickRecipe(g) {
    const pool = RECIPES.filter((r) => g.cfg.tiers.includes(r.tier) && r.id !== g.lastRecipe && g.slots.every((c) => !c || c.recipe !== r));
    const all = pool.length ? pool : RECIPES.filter((r) => g.cfg.tiers.includes(r.tier));
    const r = all[Math.floor(g.random() * all.length)];
    g.lastRecipe = r.id;
    return r;
  }

  function spawn(g) {
    const free = g.slots.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    const busy = g.slots.length - free.length;
    if (!free.length || busy >= g.cfg.at || g.spawned >= g.cfg.customers) return;
    const i = free[Math.floor(g.random() * free.length)];
    g.slots[i] = { recipe: pickRecipe(g), t: 0, patience: g.cfg.patience, look: Math.floor(g.random() * 6) };
    g.spawned++;
    g.events.push({ type: 'arrive', slot: i });
  }

  function leave(g, i, happy) {
    g.slots[i] = null;
    g.next = Math.max(g.next, 1.5);
    if (g.served + g.lost >= g.cfg.customers || g.hearts <= 0) { g.over = true; g.events.push({ type: 'over' }); }
    return happy;
  }

  function step(g, dt) {
    if (g.over) return;
    g.t += dt;
    g.slots.forEach((c, i) => {
      if (!c) return;
      c.t += dt;
      if (c.t >= c.patience) { g.lost++; g.hearts--; g.events.push({ type: 'gone', slot: i, look: c.look }); leave(g, i, false); }
    });
    if (g.over) return;
    g.next -= dt;
    if (g.next <= 0) { spawn(g); g.next = 2.5 + g.random() * 2; }
  }

  function hintShown(g, c) { return !g.cfg.hint || c.t >= g.cfg.hint; }

  const near = (x, y, p, r) => Math.hypot(x - p.x, y - p.y) <= r;
  // What sits under a stage point: a jar, the cauldron, the sink or a customer.
  function targetAt(g, x, y) {
    for (const k of g.cfg.jars) if (near(x, y, JAR_SPOTS[k], R.jar)) return { kind: 'jar', key: k };
    if (near(x, y, CAULDRON, R.cauldron)) return { kind: 'cauldron' };
    if (near(x, y, SINK, R.sink)) return { kind: 'sink' };
    for (let i = 0; i < SLOTS.length; i++) if (g.slots[i] && near(x, y, SLOTS[i], R.slot)) return { kind: 'customer', slot: i };
    return null;
  }

  // Closing the hand: scoop from a jar, or lift the whole brew out of the cauldron in a bottle.
  function grab(g, x, y) {
    if (g.over || g.held) return null;
    const t = targetAt(g, x, y);
    if (!t) return null;
    if (t.kind === 'jar') { g.held = { type: 'scoop', key: t.key }; g.events.push({ type: 'scoop', key: t.key }); return 'scoop'; }
    if (t.kind === 'cauldron' && scoops(g.cauldron)) { g.held = { type: 'bottle', mix: g.cauldron }; g.cauldron = {}; g.events.push({ type: 'bottle' }); return 'bottle'; }
    return null;
  }

  // Opening the hand: drop what is held onto whatever is under it.
  function release(g, x, y) {
    const h = g.held;
    if (!h || g.over) return null;
    g.held = null;
    const t = targetAt(g, x, y);
    if (h.type === 'scoop') {
      if (t && t.kind === 'cauldron') {
        if (scoops(g.cauldron) >= MAX_SCOOPS) { g.events.push({ type: 'full' }); return 'full'; }
        g.cauldron = { ...g.cauldron, [h.key]: (g.cauldron[h.key] || 0) + 1 };
        g.events.push({ type: 'add', key: h.key });
        return 'add';
      }
      g.events.push({ type: 'spill' });
      return 'spill';
    }
    if (t && t.kind === 'sink') { g.events.push({ type: 'pour' }); return 'pour'; }
    if (t && t.kind === 'customer') return serve(g, t.slot, h.mix);
    // A bottle let go anywhere else goes back in the pot, so nothing is lost by a slip.
    g.cauldron = h.mix;
    g.events.push({ type: 'back' });
    return 'back';
  }

  function serve(g, i, mix) {
    const c = g.slots[i];
    if (!same(mix, c.recipe.mix)) {
      g.wrong++; g.hearts--; g.lost++;
      g.events.push({ type: 'wrong', slot: i, want: c.recipe.id, look: c.look });
      leave(g, i, false);
      return 'wrong';
    }
    // Bigger recipes pay more; a quick serve earns a tip, and so does working it out before the hint.
    const left = 1 - c.t / c.patience;
    const tip = Math.round(10 * left) + (hintShown(g, c) && g.cfg.hint ? 0 : g.cfg.hint ? 5 : 0);
    const pay = 10 + 5 * scoops(c.recipe.mix) + tip;
    g.coins += pay; g.served++;
    if (left > 0.5) g.perfect++;
    g.events.push({ type: 'served', slot: i, pay, tip, look: c.look });
    leave(g, i, true);
    return 'served';
  }

  // Best possible coins for a level, used to set the star lines.
  function maxCoins(cfg) {
    const pool = RECIPES.filter((r) => cfg.tiers.includes(r.tier));
    const avg = pool.reduce((s, r) => s + scoops(r.mix), 0) / pool.length;
    return Math.round(cfg.customers * (10 + 5 * avg + 10 + (cfg.hint ? 5 : 0)));
  }

  function result(g) {
    const max = maxCoins(g.cfg), passed = g.hearts > 0 && g.served >= 1;
    const stars = !passed ? 0 : g.coins >= max * 0.86 && g.hearts === HEARTS ? 3 : g.coins >= max * 0.68 ? 2 : 1;
    return { coins: g.coins, max, stars, passed, served: g.served, lost: g.lost, wrong: g.wrong, hearts: g.hearts, customers: g.cfg.customers };
  }

  root.MIX = {
    PIGMENTS, KEYS, MAX_SCOOPS, RECIPES, LEVELS, HEARTS, SLOTS, JAR_SPOTS, CAULDRON, SINK, R,
    reduce, scoops, same, colorOf, css, createRound, step, grab, release, targetAt, hintShown, maxCoins, result,
  };
})(typeof window !== 'undefined' ? window : globalThis);
