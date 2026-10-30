// Constellations, tracing, clouds and shooting stars, free of rendering and camera, so they can be checked headless.
// The sky is 1280 x 720; star positions are in that space.
(function (root) {
  const HOVER_R = 46;       // how close the fingertip must be to a star
  const PICK_SECONDS = 0.35; // how long it rests there to pick it
  const CLOUD_SPEED = 45;

  // Points [x, y] and lines between point indexes.
  const LEVELS = [
    { name: 'The Kite', creature: 'kite', par: 15, pts: [[640, 170], [820, 360], [640, 560], [460, 360]], lines: [[0, 1], [1, 2], [2, 3], [3, 0]] },
    { name: 'The Arrow', creature: 'arrow', par: 20, pts: [[360, 360], [560, 360], [760, 360], [930, 360], [800, 240], [800, 480]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5]] },
    { name: 'Cassiopeia', creature: 'queen', par: 18, shooting: true, pts: [[300, 260], [480, 470], [640, 300], [800, 480], [980, 250]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { name: 'The Big Dipper', creature: 'dipper', par: 26, shooting: true,
      pts: [[300, 230], [450, 270], [580, 320], [700, 380], [710, 540], [930, 560], [930, 380]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { name: 'The Swan', creature: 'swan', par: 26, clouds: 1, pts: [[640, 140], [640, 300], [640, 450], [640, 600], [400, 260], [880, 260], [510, 290], [770, 290]],
      lines: [[0, 1], [1, 2], [2, 3], [1, 6], [6, 4], [1, 7], [7, 5]] },
    { name: 'The Little Bear', creature: 'bear', par: 25, shooting: true, clouds: 1,
      pts: [[280, 520], [420, 470], [560, 450], [700, 420], [760, 280], [930, 270], [900, 420]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
    { name: 'Orion the Hunter', creature: 'hunter', par: 27, clouds: 2,
      pts: [[500, 150], [780, 170], [540, 320], [640, 350], [740, 380], [480, 560], [800, 580], [640, 230]],
      lines: [[0, 7], [7, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
    { name: 'Leo the Lion', creature: 'lion', par: 30, shooting: true, clouds: 2,
      pts: [[380, 260], [460, 170], [580, 180], [600, 300], [500, 380], [760, 400], [960, 430], [880, 560], [620, 540]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [3, 5], [5, 6], [6, 7], [7, 8], [8, 4]] },
    { name: 'The Dragon', creature: 'dragon', par: 35, shooting: true, clouds: 2,
      pts: [[220, 520], [340, 440], [470, 470], [590, 390], [700, 300], [830, 330], [940, 230], [1060, 270], [1050, 400], [930, 410], [960, 560]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 6], [8, 10]] },
    { name: 'The Great Whale', creature: 'whale', par: 48, shooting: true, clouds: 3,
      pts: [[200, 400], [320, 300], [320, 500], [480, 380], [640, 270], [820, 250], [1000, 300], [1080, 420], [960, 540], [760, 560], [580, 520], [880, 400]],
      lines: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 3], [6, 11], [11, 8]] },
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

  function createSky(levelIndex, seed) {
    const lv = LEVELS[levelIndex], r = rng(seed || 7 + levelIndex);
    const clouds = [];
    for (let k = 0; k < (lv.clouds || 0); k++) clouds.push({ x: -200 - k * 700, y: 220 + (k % 2) * 220, w: 230, h: 110, dir: 1 });
    return {
      level: levelIndex, t: 0, lit: lv.lines.map(() => false), held: -1, hover: -1, hoverT: 0, done: false, events: [],
      caught: 0, clouds, shooting: null, nextShot: 5 + r() * 4, rand: r,
    };
  }

  const covered = (s, x, y) => s.clouds.some((c) => Math.abs(x - c.x) < c.w / 2 && Math.abs(y - c.y) < c.h / 2);

  function lineIndex(lv, a, b) { return lv.lines.findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a)); }

  // cursor: the fingertip in sky space, or null when there is no hand.
  function step(s, dt, cursor) {
    if (s.done) return;
    const lv = LEVELS[s.level];
    s.t += dt;
    for (const c of s.clouds) {
      c.x += c.dir * CLOUD_SPEED * dt;
      if (c.x > 1280 + c.w) c.x = -c.w - 400;
    }
    if (lv.shooting) {
      if (!s.shooting && s.t >= s.nextShot) {
        const y0 = 90 + s.rand() * 200;
        s.shooting = { x: -60, y: y0, vx: 520, vy: 80 + s.rand() * 60 };
        s.events.push({ type: 'shooting' });
      }
      if (s.shooting) {
        const sh = s.shooting;
        sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        if (cursor && Math.hypot(cursor.x - sh.x, cursor.y - sh.y) < 70) { s.caught++; s.events.push({ type: 'caught', x: sh.x, y: sh.y }); s.shooting = null; s.nextShot = s.t + 6 + s.rand() * 5; }
        else if (sh.x > 1340 || sh.y > 760) { s.shooting = null; s.nextShot = s.t + 6 + s.rand() * 5; }
      }
    }
    let over = -1;
    if (cursor) lv.pts.forEach(([x, y], i) => { if (Math.hypot(cursor.x - x, cursor.y - y) < HOVER_R && !covered(s, x, y)) over = i; });
    if (over !== s.hover) { s.hover = over; s.hoverT = 0; }
    if (over >= 0 && over !== s.held) {
      s.hoverT += dt;
      if (s.hoverT >= PICK_SECONDS) {
        const k = s.held >= 0 ? lineIndex(lv, s.held, over) : -1;
        if (k >= 0 && !s.lit[k]) { s.lit[k] = true; s.events.push({ type: 'line', index: k, from: s.held, to: over }); }
        // Any other star simply starts a new thread from there; branching pictures need that.
        else s.events.push({ type: 'pick', star: over });
        s.held = over; s.hoverT = 0;
        if (s.lit.every(Boolean)) { s.done = true; s.held = -1; s.events.push({ type: 'done' }); }
      }
    }
  }

  function result(s) {
    const par = LEVELS[s.level].par;
    const stars = s.t <= par ? 3 : s.t <= par * 1.7 ? 2 : 1;
    return { stars, seconds: Math.round(s.t), caught: s.caught,
      score: 100 + stars * 30 + Math.max(0, Math.round(par * 1.5 - s.t)) + s.caught * 25 };
  }

  root.Stars = { LEVELS, HOVER_R, PICK_SECONDS, createSky, step, result, lineIndex, covered };
})(typeof window !== 'undefined' ? window : globalThis);
