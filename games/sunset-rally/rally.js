// Sunset Rally race logic: course, cars, pickups and scoring. No drawing, so it runs headless in tests.
(function (root) {
  const MAX_SPEED = 50; // segments per second
  const ACCEL = 22;
  const BOOST = 1.35;
  const OFFROAD_CAP = 0.45;
  const STEER_K = 7; // how fast the car closes on the hand position
  const DRIFT = 0.9; // how hard bends push the car outwards
  const HAND_RANGE = 1.15; // hand at the frame edge puts the car just past the kerb
  const LANES = [-0.62, 0, 0.62];

  const LEVELS = [
    { name: 'Palm Coast', theme: 'coast', length: 2000, bends: 0.45, rivals: [0.74, 0.77, 0.8, 0.82, 0.85], traffic: 6, seed: 11 },
    { name: 'Cactus Road', theme: 'desert', length: 2100, bends: 0.55, rivals: [0.76, 0.79, 0.82, 0.85, 0.87], traffic: 9, seed: 23 },
    { name: 'Pine Hills', theme: 'forest', length: 2300, bends: 0.65, rivals: [0.78, 0.81, 0.84, 0.86, 0.88], traffic: 11, seed: 37 },
    { name: 'Harbour Lights', theme: 'night', length: 2500, bends: 0.7, rivals: [0.79, 0.82, 0.85, 0.87, 0.89], traffic: 14, seed: 41 },
    { name: 'Snowy Pass', theme: 'snow', length: 2600, bends: 0.8, rivals: [0.8, 0.83, 0.86, 0.88, 0.9], traffic: 14, seed: 53 },
    { name: 'Red Canyon', theme: 'canyon', length: 2800, bends: 0.85, rivals: [0.81, 0.84, 0.87, 0.89, 0.91], traffic: 16, seed: 67 },
    { name: 'Lavender Fields', theme: 'meadow', length: 3000, bends: 0.9, rivals: [0.82, 0.85, 0.88, 0.9, 0.92], traffic: 18, seed: 79 },
    { name: 'Sunset Grand Prix', theme: 'coast', length: 3400, bends: 1, rivals: [0.83, 0.86, 0.89, 0.91, 0.93], traffic: 20, seed: 97 },
  ];

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // Bends ease in and out so the road never snaps sideways.
  function buildRoad(lv) {
    const r = rng(lv.seed), curve = [], hill = [];
    let y = 0;
    const straight = (n) => { for (let i = 0; i < n; i++) { curve.push(0); hill.push(y); } };
    straight(120);
    while (curve.length < lv.length - 80) {
      const c = (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.65) * lv.bends;
      const h = (r() - 0.5) * 60;
      const ease = 25 + Math.floor(r() * 20), hold = 30 + Math.floor(r() * 60);
      const total = ease * 2 + hold;
      for (let i = 0; i < total; i++) {
        const k = i < ease ? i / ease : i >= ease + hold ? (total - i) / ease : 1;
        curve.push(c * k);
        y += h * (k * (i < total / 2 ? 1 : -1)) * 0.05;
        hill.push(y);
      }
      if (r() < 0.6) straight(20 + Math.floor(r() * 50));
    }
    straight(lv.length - curve.length);
    return { curve, hill };
  }

  function createRace(level) {
    const lv = LEVELS[level], r = rng(lv.seed * 7 + 3), road = buildRoad(lv);
    const rivals = lv.rivals.map((skill, i) => ({
      id: i, z: 6 + i * 5, x: LANES[i % 2 ? 2 : 0], laneX: LANES[i % 2 ? 2 : 0], speed: 0, skill, finishedAt: null,
    }));
    const traffic = [];
    for (let i = 0; i < lv.traffic; i++) {
      traffic.push({ z: 200 + (i + r() * 0.6) * ((lv.length - 400) / lv.traffic), x: LANES[Math.floor(r() * 3)], speed: MAX_SPEED * 0.32 });
    }
    const pickups = [];
    for (let z = 150; z < lv.length - 100; z += 45 + Math.floor(r() * 30)) {
      const lane = LANES[Math.floor(r() * 3)];
      if (r() < 0.22) pickups.push({ z, x: lane, kind: 'nitro', taken: false });
      else for (let k = 0; k < 3; k++) pickups.push({ z: z + k * 4, x: lane, kind: 'coin', taken: false });
    }
    return {
      level, length: lv.length, road, t: 0, started: false, done: false,
      player: { z: 0, x: 0, speed: 0, nitro: 0.5, boosting: false, offroad: false, bumpUntil: 0, finishedAt: null },
      rivals, traffic, pickups, coins: 0, bumps: 0, events: [],
    };
  }

  const curveAt = (race, z) => race.road.curve[Math.max(0, Math.min(race.length - 1, Math.floor(z)))] || 0;
  // Palm position 0..1 across the camera, already mirrored, to a target spot across the road.
  const handToRoad = (hx) => Math.max(-HAND_RANGE, Math.min(HAND_RANGE, (hx - 0.5) * 2 * HAND_RANGE));

  // input: { x: 0..1 hand position or null, fist: bool }. A null x means the hand is not seen.
  function step(race, dt, input) {
    if (race.done) return;
    race.t += dt;
    const p = race.player;
    if (p.finishedAt == null) {
      const wantBoost = !!(input && input.fist) && p.nitro > 0 && !p.offroad;
      if (wantBoost && !p.boosting) race.events.push({ type: 'boost' });
      p.boosting = wantBoost;
      if (p.boosting) p.nitro = Math.max(0, p.nitro - dt / 3);
      const top = MAX_SPEED * (p.boosting ? BOOST : 1) * (p.offroad ? OFFROAD_CAP : 1);
      if (race.t < p.bumpUntil) p.speed = Math.max(p.speed - ACCEL * dt, 0);
      else if (p.speed < top) p.speed = Math.min(top, p.speed + ACCEL * (p.boosting ? 1.6 : 1) * dt);
      else p.speed = Math.max(top, p.speed - ACCEL * 2 * dt);

      if (input && input.x != null) p.x += (handToRoad(input.x) - p.x) * Math.min(1, STEER_K * dt);
      p.x -= curveAt(race, p.z) * (p.speed / MAX_SPEED) * DRIFT * dt;
      p.x = Math.max(-1.6, Math.min(1.6, p.x));
      const off = Math.abs(p.x) > 1.05;
      if (off && !p.offroad) race.events.push({ type: 'offroad' });
      p.offroad = off;
      p.z += p.speed * dt;
    }

    for (const c of race.traffic) c.z += c.speed * dt;
    for (const rv of race.rivals) {
      if (rv.finishedAt != null) continue;
      // Rivals stay in reach of the player so every race stays a race.
      const gap = rv.z - p.z;
      const band = gap > 60 ? 0.9 : gap < -40 ? 1.08 : 1;
      const target = MAX_SPEED * rv.skill * band;
      rv.speed += Math.max(-ACCEL * dt, Math.min(ACCEL * 0.8 * dt, target - rv.speed));
      const block = race.traffic.find((c) => c.z - rv.z > 0 && c.z - rv.z < 12 && Math.abs(c.x - rv.laneX) < 0.3);
      if (block) rv.laneX = LANES.filter((l) => Math.abs(l - block.x) > 0.3).sort((a, b) => Math.abs(a - rv.laneX) - Math.abs(b - rv.laneX))[0];
      rv.x += (rv.laneX - rv.x) * Math.min(1, 3 * dt);
      rv.z += rv.speed * dt;
      if (rv.z >= race.length) rv.finishedAt = race.t;
    }

    if (p.finishedAt == null && race.t >= p.bumpUntil) {
      for (const c of race.traffic.concat(race.rivals)) {
        const dz = c.z - p.z;
        if (dz > 0 && dz < 1.6 && Math.abs(c.x - p.x) < 0.42) {
          p.speed = Math.min(p.speed, c.speed * 0.75);
          p.x += p.x >= c.x ? 0.25 : -0.25;
          p.bumpUntil = race.t + 0.5;
          race.bumps++;
          race.events.push({ type: 'bump' });
          break;
        }
      }
    }
    for (const k of race.pickups) {
      if (k.taken || Math.abs(k.z - p.z) > 1.2 || Math.abs(k.x - p.x) > 0.36) continue;
      k.taken = true;
      if (k.kind === 'coin') { race.coins++; race.events.push({ type: 'coin' }); }
      else { p.nitro = Math.min(1, p.nitro + 0.4); race.events.push({ type: 'nitro' }); }
    }

    if (p.finishedAt == null && p.z >= race.length) {
      p.finishedAt = race.t; p.z = race.length; p.boosting = false;
      race.events.push({ type: 'finish', position: position(race) });
    }
    if (p.finishedAt != null && race.t - p.finishedAt > 0.1) race.done = true;
  }

  function position(race) {
    const p = race.player;
    return 1 + race.rivals.filter((rv) => rv.finishedAt != null ? (p.finishedAt == null || rv.finishedAt < p.finishedAt) : rv.z > p.z).length;
  }

  function result(race) {
    const pos = position(race), secs = Math.round(race.player.finishedAt ?? race.t);
    const stars = pos === 1 ? 3 : pos <= 3 ? 2 : 1;
    const score = (7 - pos) * 100 + race.coins * 10 + Math.max(0, 200 - race.bumps * 20);
    return { position: pos, seconds: secs, coins: race.coins, bumps: race.bumps, stars, score };
  }

  root.Rally = { LEVELS, LANES, MAX_SPEED, createRace, step, position, result, handToRoad, curveAt };
})(typeof window !== 'undefined' ? window : globalThis);
