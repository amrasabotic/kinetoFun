// Plants, weather and pests, free of rendering and camera, so growing and level balance can be tested headless.
// Positions across the garden run from 0 (left) to 1 (right).
(function (root) {
  const SPECIES = {
    sunflower: { name: 'Sunflower', sun: [60, 95], water: [50, 85] },
    cactus:    { name: 'Cactus',    sun: [65, 100], water: [5, 35] },
    fern:      { name: 'Fern',      sun: [10, 40], water: [60, 95] },
    tulip:     { name: 'Tulip',     sun: [35, 70], water: [35, 70] },
    rose:      { name: 'Rose',      sun: [50, 80], water: [45, 75] },
  };
  const GIVE = 34;          // how fast sun or rain fills a plant, per second
  const GROW_SECONDS = 9;   // time in its happy range for a plant to bloom
  const BUG_SPEED = 0.05;
  const CLOUD_SPEED = 0.06, CLOUD_WIDTH = 0.07, CLOUD_RAIN = 22;
  // Seconds of sunshine a frozen plant needs before it grows again.
  const FROST_SUN = 1.5;
  const SEASON = {
    spring: { sun: 2.5, water: 2 },
    summer: { sun: 1.5, water: 4.5 },
    autumn: { sun: 4, water: 2 },
    winter: { sun: 5, water: 1.5 },
  };

  // pests: [seconds, plant index]; bugs walk in from the nearer edge.
  // events: clouds drift across and rain on what is below, heatwaves double the drying, frost stops a plant until it is warmed.
  const LEVELS = [
    { name: 'First Sprout', season: 'spring', plants: ['tulip'], pests: [], events: [], par: 18 },
    { name: 'Sun and Rain', season: 'spring', plants: ['sunflower', 'fern'], pests: [], events: [], par: 26 },
    { name: 'Hungry Bugs', season: 'spring', plants: ['tulip', 'rose', 'tulip'], pests: [[6, 0], [14, 2], [22, 1]], events: [], par: 52 },
    { name: 'Desert Corner', season: 'summer', plants: ['cactus', 'sunflower', 'cactus'], pests: [[14, 1]],
      events: [{ at: 8, type: 'cloud', dir: 1 }], par: 40 },
    { name: 'Hot Summer', season: 'summer', plants: ['rose', 'fern', 'sunflower', 'tulip'], pests: [[10, 0], [24, 3]],
      events: [{ at: 14, type: 'heat', seconds: 8 }], par: 55 },
    { name: 'Shady Ferns', season: 'summer', plants: ['fern', 'cactus', 'fern', 'sunflower'], pests: [[16, 3]],
      events: [{ at: 6, type: 'cloud', dir: -1 }, { at: 26, type: 'cloud', dir: 1 }], par: 50 },
    { name: 'Windy Autumn', season: 'autumn', plants: ['tulip', 'sunflower', 'rose', 'tulip'], pests: [[5, 0], [11, 3], [18, 1], [25, 2], [32, 0]],
      events: [{ at: 20, type: 'cloud', dir: -1 }], par: 60 },
    { name: 'Busy Garden', season: 'autumn', plants: ['cactus', 'fern', 'tulip', 'rose', 'sunflower'], pests: [[8, 4], [18, 0], [28, 2], [36, 3]],
      events: [{ at: 12, type: 'cloud', dir: 1 }], par: 70 },
    { name: 'Cold Snap', season: 'winter', plants: ['sunflower', 'rose', 'tulip', 'rose'], pests: [[12, 1], [26, 2]],
      events: [{ at: 6, type: 'frost', plant: 0 }, { at: 18, type: 'frost', plant: 3 }], par: 65 },
    { name: 'The Grand Bloom', season: 'winter', plants: ['sunflower', 'fern', 'cactus', 'tulip', 'rose', 'sunflower'],
      pests: [[6, 0], [14, 4], [22, 1], [30, 5], [38, 2]],
      events: [{ at: 10, type: 'frost', plant: 3 }, { at: 16, type: 'cloud', dir: -1 }, { at: 28, type: 'frost', plant: 0 }], par: 90 },
  ];

  const spotOf = (count, i) => (i + 1) / (count + 1);

  function createGarden(levelIndex) {
    const lv = LEVELS[levelIndex];
    return {
      level: levelIndex, t: 0, done: false, events: [], nextPest: 0, nextEvent: 0, uid: 1, gusts: 0,
      plants: lv.plants.map((kind, i) => ({ kind, x: spotOf(lv.plants.length, i), sun: 30, water: 30, growth: 0, bloomed: false, frost: 0 })),
      bugs: [], clouds: [], heatUntil: 0,
    };
  }

  const inBand = (v, [lo, hi]) => v >= lo && v <= hi;
  function happy(p) { const s = SPECIES[p.kind]; return inBand(p.sun, s.sun) && inBand(p.water, s.water); }

  // The plant the hand is over: the closest one, within half the gap between plants.
  function plantAt(g, x) {
    if (x == null) return -1;
    const half = 0.5 / (g.plants.length + 1);
    let best = -1, bestD = Infinity;
    g.plants.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bestD) { bestD = d; best = i; } });
    return bestD <= Math.max(half, 0.12) ? best : -1;
  }

  // input: { x, weather: 'sun' | 'rain' | null, gust: [x0, x1] | null }
  function step(g, dt, input) {
    if (g.done) return;
    const lv = LEVELS[g.level], season = SEASON[lv.season];
    g.t += dt;
    while (g.nextPest < lv.pests.length && lv.pests[g.nextPest][0] <= g.t) {
      const target = lv.pests[g.nextPest++][1], p = g.plants[target];
      const fromLeft = p.x < 0.5;
      g.bugs.push({ id: g.uid++, target, x: fromLeft ? -0.03 : 1.03, dir: fromLeft ? 1 : -1, on: false });
      g.events.push({ type: 'bug', target });
    }
    while (g.nextEvent < lv.events.length && lv.events[g.nextEvent].at <= g.t) {
      const e = lv.events[g.nextEvent++];
      if (e.type === 'cloud') g.clouds.push({ x: e.dir > 0 ? -0.1 : 1.1, dir: e.dir });
      if (e.type === 'heat') g.heatUntil = g.t + e.seconds;
      if (e.type === 'frost' && !g.plants[e.plant].bloomed) g.plants[e.plant].frost = FROST_SUN;
      g.events.push({ type: e.type, plant: e.plant });
    }
    for (const c of g.clouds) c.x += c.dir * CLOUD_SPEED * dt;
    g.clouds = g.clouds.filter((c) => c.x > -0.15 && c.x < 1.15);
    const heat = g.t < g.heatUntil ? 2 : 1;
    const aim = input ? plantAt(g, input.x) : -1;
    g.plants.forEach((p, i) => {
      const aimed = i === aim && input && input.weather;
      p.sun = Math.max(0, Math.min(100, p.sun + (aimed && input.weather === 'sun' ? GIVE : -season.sun) * dt));
      p.water = Math.max(0, Math.min(100, p.water + (aimed && input.weather === 'rain' ? GIVE : -season.water * heat) * dt));
      if (g.clouds.some((c) => Math.abs(c.x - p.x) < CLOUD_WIDTH)) p.water = Math.min(100, p.water + CLOUD_RAIN * dt);
      if (p.frost > 0 && aimed && input.weather === 'sun') {
        p.frost = Math.max(0, p.frost - dt);
        if (p.frost === 0) g.events.push({ type: 'thaw', plant: i });
      }
      const bugged = g.bugs.some((b) => b.on && b.target === i);
      if (!p.bloomed && happy(p) && !bugged && p.frost === 0) {
        p.growth = Math.min(100, p.growth + (100 / GROW_SECONDS) * dt);
        if (p.growth >= 100) { p.bloomed = true; g.events.push({ type: 'bloom', plant: i }); }
      }
    });
    if (input && input.gust) {
      const [a, b] = input.gust[0] < input.gust[1] ? input.gust : [input.gust[1], input.gust[0]];
      const before = g.bugs.length;
      g.bugs = g.bugs.filter((bug) => bug.x < a - 0.05 || bug.x > b + 0.05);
      if (g.bugs.length < before) { g.gusts += before - g.bugs.length; g.events.push({ type: 'blown', count: before - g.bugs.length }); }
    }
    for (const bug of g.bugs) {
      if (bug.on) continue;
      const p = g.plants[bug.target];
      bug.x += bug.dir * BUG_SPEED * dt;
      if ((bug.dir > 0 && bug.x >= p.x - 0.02) || (bug.dir < 0 && bug.x <= p.x + 0.02)) { bug.on = true; bug.x = p.x + bug.dir * -0.02; g.events.push({ type: 'munch', plant: bug.target }); }
    }
    if (g.plants.every((p) => p.bloomed)) { g.done = true; g.events.push({ type: 'done' }); }
  }

  function result(g) {
    const par = LEVELS[g.level].par;
    const stars = g.t <= par ? 3 : g.t <= par * 1.6 ? 2 : 1;
    return { stars, seconds: Math.round(g.t), bugs: g.gusts, score: 100 + stars * 30 + Math.max(0, Math.round(par * 1.5 - g.t)) + g.gusts * 5 };
  }

  // A quick sideways sweep of the hand; returns [x0, x1] when the last few samples moved fast enough.
  function detectSwipe(samples) {
    if (samples.length < 3) return null;
    const last = samples[samples.length - 1];
    const recent = samples.filter((s) => last.t - s.t <= 0.25);
    if (recent.length < 3) return null;
    const first = recent[0], dx = last.x - first.x, dt = last.t - first.t;
    if (dt <= 0 || Math.abs(dx) < 0.18 || Math.abs(dx) / dt < 1.1) return null;
    return [first.x, last.x];
  }

  root.Garden = { SPECIES, SEASON, LEVELS, GIVE, GROW_SECONDS, createGarden, step, result, plantAt, happy, detectSwipe, spotOf, CLOUD_WIDTH, FROST_SUN };
})(typeof window !== 'undefined' ? window : globalThis);
