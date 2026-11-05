// Pet Show rules: skills, the four events, rivals and shows. No drawing, so it runs headless in tests.
(function (root) {
  const SKILLS = ['speed', 'agility', 'style', 'smarts'];
  const EVENT_OF = { speed: 'sprint', agility: 'hurdles', style: 'dance', smarts: 'memory' };
  const PETS = {
    puppy: { name: 'Puppy', start: { speed: 20, agility: 15, style: 10, smarts: 15 } },
    kitten: { name: 'Kitten', start: { speed: 10, agility: 20, style: 15, smarts: 15 } },
    bunny: { name: 'Bunny', start: { speed: 15, agility: 20, style: 15, smarts: 10 } },
    dragon: { name: 'Baby Dragon', start: { speed: 15, agility: 10, style: 20, smarts: 15 } },
  };
  // Rival scores per event; each show picks three events.
  const SHOWS = [
    { name: 'Village Fair', events: ['sprint', 'hurdles', 'dance'], rivals: [['Biscuit', 'puppy', 34], ['Mittens', 'kitten', 38], ['Clover', 'bunny', 42]] },
    { name: 'Town Show', events: ['hurdles', 'dance', 'memory'], rivals: [['Pepper', 'kitten', 44], ['Rocket', 'puppy', 48], ['Thumper', 'bunny', 52]] },
    { name: 'County Cup', events: ['sprint', 'memory', 'dance'], rivals: [['Ember', 'dragon', 54], ['Duchess', 'kitten', 58], ['Bolt', 'puppy', 62]] },
    { name: 'Royal Show', events: ['sprint', 'hurdles', 'memory'], rivals: [['Sir Fluff', 'bunny', 63], ['Blaze', 'dragon', 67], ['Princess', 'kitten', 71]] },
    { name: 'Grand Champion Show', events: ['dance', 'hurdles', 'memory'], rivals: [['Ziggy', 'puppy', 71], ['Saffron', 'dragon', 75], ['Champ', 'bunny', 79]] },
  ];

  function rng(seed) {
    let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Three levels per event; 2 stars on a level opens the next, and harder levels train faster.
  const LEVELS = 3;
  const LEVEL_GAIN = [1, 1.25, 1.5];
  const SHOW_LEVEL = [0, 0, 1, 1, 2];
  const EVENTS = ['sprint', 'hurdles', 'dance', 'memory'];
  const starsFor = (perf) => (perf >= 0.85 ? 3 : perf >= 0.6 ? 2 : perf >= 0.3 ? 1 : 0);

  function newPet(kind, name) {
    return { kind, name, skills: { ...PETS[kind].start }, trophies: Array(SHOWS.length).fill(0), unlocked: 1, trained: 0, ...freshLevels() };
  }
  function freshLevels() { return { levels: Object.fromEntries(EVENTS.map((e) => [e, 1])), stars: Object.fromEntries(EVENTS.map((e) => [e, [0, 0, 0]])) }; }
  // Pets saved before levels existed get them on load.
  function upgrade(pet) { if (!pet.levels || !pet.stars) Object.assign(pet, freshLevels()); return pet; }

  // Records the stars for a finished level and opens the next one; returns true when a new level opened.
  function recordLevel(pet, event, level, perf) {
    upgrade(pet);
    const st = starsFor(perf);
    pet.stars[event][level] = Math.max(pet.stars[event][level], st);
    if (st >= 2 && level + 2 > pet.levels[event] && level + 1 < LEVELS) { pet.levels[event] = level + 2; return true; }
    return false;
  }

  // A good session teaches more; growth slows as a skill nears the top.
  function train(pet, skill, perf, level = 0) {
    const p = Math.max(0, Math.min(1, perf));
    const before = pet.skills[skill];
    const gain = (3 + 7 * p) * (1 - before / 130) * LEVEL_GAIN[level];
    pet.skills[skill] = Math.min(100, before + gain);
    pet.trained++;
    return pet.skills[skill] - before;
  }

  // Half from how well the event went today, half from training.
  const eventScore = (perf, skill) => Math.round(50 * Math.max(0, Math.min(1, perf)) + 0.5 * skill);
  const SKILL_FOR = Object.fromEntries(Object.entries(EVENT_OF).map(([s, e]) => [e, s]));

  function judge(pet, level, perfs, random = Math.random) {
    const show = SHOWS[level];
    const you = show.events.map((e, i) => eventScore(perfs[i], pet.skills[SKILL_FOR[e]]));
    const table = [{ name: pet.name, kind: pet.kind, you: true, scores: you }];
    for (const [name, kind, base] of show.rivals) table.push({ name, kind, scores: show.events.map(() => Math.round(base + (random() - 0.5) * 10)) });
    for (const r of table) r.total = r.scores.reduce((a, b) => a + b, 0);
    table.sort((a, b) => b.total - a.total || (b.you ? 1 : -1));
    const place = table.findIndex((r) => r.you) + 1;
    const medal = place <= 3 ? 4 - place : 0; // 3 gold, 2 silver, 1 bronze
    pet.trophies[level] = Math.max(pet.trophies[level], medal);
    if (place <= 2) pet.unlocked = Math.max(pet.unlocked, Math.min(SHOWS.length, level + 2));
    return { table, place, medal };
  }

  // ---------- Sprint: pump the hand up and down; each pump pushes the pet on ----------
  const SPRINT = { time: 15, goal: 100, goals: [100, 125, 150] };
  function createSprint(seed, level = 0) { return { level, goal: SPRINT.goals[level], t: 0, dist: 0, speed: 0, dir: 0, ext: null, pumps: 0, over: false, events: [] }; }
  // y is the palm height 0 (top) to 1 (bottom), or null when the hand is not seen.
  function stepSprint(g, dt, y) {
    if (g.over) return;
    g.t += dt;
    // A pump is a turn back after the hand has travelled at least 0.06 of the frame height one way.
    if (y != null) {
      if (g.ext == null) g.ext = y;
      else if (g.dir === 0) { if (Math.abs(y - g.ext) > 0.06) { g.dir = Math.sign(y - g.ext); g.ext = y; } }
      else if ((y - g.ext) * g.dir > 0) g.ext = y;
      else if ((g.ext - y) * g.dir > 0.06) { g.pumps++; g.speed = Math.min(12, g.speed + 2.2); g.dir = -g.dir; g.ext = y; g.events.push({ type: 'pump' }); }
    }
    g.speed = Math.max(0, g.speed - g.speed * 0.9 * dt);
    g.dist += g.speed * dt;
    if (g.t >= SPRINT.time) { g.over = true; g.events.push({ type: 'over' }); }
  }
  const sprintPerf = (g) => Math.min(1, g.dist / g.goal);

  // ---------- Hurdles: the pet runs by itself; raise the hand to jump ----------
  const HURDLES = { count: 10, speed: 22, air: 0.75, raise: 0.38, lower: 0.5, counts: [10, 12, 14], speeds: [22, 27, 32], gaps: [22, 19, 17] };
  function createHurdles(seed, level = 0) {
    const r = seed != null ? rng(seed) : Math.random, hs = [];
    let x = 30;
    for (let i = 0; i < HURDLES.counts[level]; i++) { x += HURDLES.gaps[level] + r() * 18; hs.push({ x, done: false, hit: false }); }
    // Faster runs get a shorter jump so it covers the same ground; the hurdles also come sooner after each other.
    return { level, speed: HURDLES.speeds[level], airTime: HURDLES.air * HURDLES.speed / HURDLES.speeds[level] * 1.1, t: 0, x: 0, air: 0, armed: true, hurdles: hs, cleared: 0, hit: 0, over: false, events: [] };
  }
  function stepHurdles(g, dt, y) {
    if (g.over) return;
    g.t += dt;
    g.x += g.speed * dt;
    if (g.air > 0) g.air = Math.max(0, g.air - dt);
    // Raising the hand above the line jumps; it has to come back down before the next jump.
    if (y != null) {
      if (y > HURDLES.lower) g.armed = true;
      if (y < HURDLES.raise && g.armed && g.air === 0) { g.air = g.airTime; g.armed = false; g.events.push({ type: 'jump' }); }
    }
    for (const h of g.hurdles) {
      if (h.done || g.x < h.x) continue;
      h.done = true;
      if (g.air > 0) { g.cleared++; g.events.push({ type: 'clear' }); } else { h.hit = true; g.hit++; g.events.push({ type: 'knock' }); }
    }
    if (g.hurdles.every((h) => h.done) && g.x > g.hurdles[g.hurdles.length - 1].x + 10) { g.over = true; g.events.push({ type: 'over' }); }
  }
  const hurdlesPerf = (g) => g.cleared / g.hurdles.length;

  // ---------- Dance: be on the lit pad when the beat lands ----------
  const DANCE = { beats: 16, gap: 1.0, window: 0.35, lead: 2, gaps: [1.0, 0.8, 0.66], windows: [0.35, 0.3, 0.26] };
  const PADS = ['left', 'up', 'right', 'down'];
  function createDance(seed, level = 0) {
    const r = seed != null ? rng(seed) : Math.random, steps = [];
    let last = -1;
    for (let i = 0; i < DANCE.beats; i++) { let p; do p = Math.floor(r() * 4); while (p === last); last = p; steps.push({ at: 2 + i * DANCE.gaps[level], pad: PADS[p], result: null }); }
    return { level, window: DANCE.windows[level], t: 0, steps, hits: 0, over: false, events: [] };
  }
  // pad is the pad the hand is over right now, or null.
  function stepDance(g, dt, pad) {
    if (g.over) return;
    g.t += dt;
    for (const s of g.steps) {
      if (s.result) continue;
      if (Math.abs(g.t - s.at) <= g.window && pad === s.pad) { s.result = 'hit'; g.hits++; g.events.push({ type: 'hit', pad }); }
      else if (g.t - s.at > g.window) { s.result = 'miss'; g.events.push({ type: 'miss' }); }
    }
    if (g.steps.every((s) => s.result)) { g.over = true; g.events.push({ type: 'over' }); }
  }
  const dancePerf = (g) => g.hits / DANCE.beats;

  // ---------- Memory: watch the pads light up, then rest the hand on them in order ----------
  const MEMORY = { start: 3, best: 8, starts: [3, 4, 5], bests: [7, 8, 9] };
  function createMemory(seed, level = 0) {
    const r = seed != null ? rng(seed) : Math.random;
    const seq = [];
    for (let i = 0; i < 12; i++) seq.push(PADS[Math.floor(r() * 4)]);
    return { level, start: MEMORY.starts[level], top: MEMORY.bests[level], seq, len: MEMORY.starts[level], pos: 0, best: 0, over: false, events: [] };
  }
  function pressMemory(g, pad) {
    if (g.over) return null;
    if (pad !== g.seq[g.pos]) { g.over = true; g.events.push({ type: 'wrong' }, { type: 'over' }); return false; }
    g.pos++;
    if (g.pos >= g.len) {
      g.best = g.len; g.pos = 0; g.len++;
      g.events.push({ type: 'round' });
      if (g.len > g.top) { g.over = true; g.events.push({ type: 'over' }); }
    }
    return true;
  }
  // Rounds beyond the starting length, so every level is marked on the same scale.
  const memoryPerf = (g) => Math.min(1, Math.max(0, g.best - g.start + 1) / (g.top - g.start + 1));

  root.Show = { LEVELS, LEVEL_GAIN, SHOW_LEVEL, EVENTS, starsFor, recordLevel, upgrade, SKILLS, EVENT_OF, SKILL_FOR, PETS, SHOWS, PADS, SPRINT, HURDLES, DANCE, MEMORY, newPet, train, eventScore, judge,
    createSprint, stepSprint, sprintPerf, createHurdles, stepHurdles, hurdlesPerf, createDance, stepDance, dancePerf, createMemory, pressMemory, memoryPerf };
})(typeof window !== 'undefined' ? window : globalThis);
