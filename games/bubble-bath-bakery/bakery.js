// Orders, kneading, rolling, baking and decorating, free of rendering and camera, so days can be played headless.
// The hand arrives as { x, y } in 0..1 of the screen plus a pose: 'open', 'fist' or 'other'.
(function (root) {
  const JARS = [
    { id: 'pink', name: 'Strawberry icing', color: '#ff8fb8', x: 0.2 },
    { id: 'choc', name: 'Chocolate', color: '#7a4a2a', x: 0.35 },
    { id: 'sprinkles', name: 'Sprinkles', color: '#ffd166', x: 0.5 },
    { id: 'cherry', name: 'Cherries', color: '#e63946', x: 0.65 },
    { id: 'blue', name: 'Blueberries', color: '#4d6fd6', x: 0.8 },
  ];
  const JAR_Y = 0.24, JAR_HALF = 0.065, JAR_HOLD = 0.8;
  const ROLL_SWEEP = 0.18;
  const BAKE_SECONDS = 6;      // time for the needle to cross the whole gauge once
  const BAKE_MAX = 1.3;        // past this it is certainly burnt and comes out by itself

  const TREATS = {
    cookies: { name: 'Cookies', steps: [['knead', 4], ['bake']] },
    bread: { name: 'Bread', steps: [['knead', 6], ['roll', 4], ['bake']] },
    cupcake: { name: 'Cupcake', steps: [['knead', 4], ['bake'], ['decorate', 1]] },
    donut: { name: 'Donut', steps: [['knead', 4], ['roll', 2], ['bake'], ['decorate', 2]] },
    pie: { name: 'Berry Pie', steps: [['knead', 5], ['roll', 4], ['bake'], ['decorate', 2]] },
    cake: { name: 'Layer Cake', steps: [['knead', 6], ['bake'], ['decorate', 3]] },
    birthday: { name: 'Birthday Cake', steps: [['knead', 6], ['roll', 4], ['bake'], ['decorate', 4]] },
  };

  // Each day: customers, golden zone of the oven gauge, and a target time.
  const LEVELS = [
    { name: 'Opening Day', orders: ['cookies'], zone: [0.55, 0.85], par: 20 },
    { name: 'Fresh Bread', orders: ['bread'], zone: [0.55, 0.85], par: 28 },
    { name: 'Cupcake Corner', orders: ['cupcake', 'cookies'], zone: [0.58, 0.84], par: 38 },
    { name: 'Donut Day', orders: ['donut', 'cupcake'], zone: [0.58, 0.82], par: 50 },
    { name: 'Busy Morning', orders: ['bread', 'donut', 'cookies'], zone: [0.6, 0.82], par: 62 },
    { name: 'Pie Party', orders: ['pie', 'cupcake'], zone: [0.6, 0.8], par: 55 },
    { name: 'Cake Shop', orders: ['cake', 'donut'], zone: [0.62, 0.8], par: 60 },
    { name: 'Lunch Rush', orders: ['bread', 'pie', 'cupcake', 'cookies'], zone: [0.62, 0.8], par: 85 },
    { name: 'Sweet Tooth', orders: ['cake', 'pie', 'donut'], zone: [0.64, 0.8], par: 85 },
    { name: 'The Big Birthday', orders: ['birthday', 'cake', 'cupcake'], zone: [0.65, 0.8], par: 95 },
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

  function createDay(levelIndex, seed) {
    const lv = LEVELS[levelIndex], r = rng(seed || 9 + levelIndex);
    const orders = lv.orders.map((kind) => {
      const steps = TREATS[kind].steps.map(([type, n]) => {
        if (type !== 'decorate') return { type, need: n || 1, done: 0 };
        const toppings = [];
        for (let k = 0; k < n; k++) { let j; do { j = JARS[Math.floor(r() * JARS.length)].id; } while (toppings.includes(j)); toppings.push(j); }
        return { type, need: n, done: 0, toppings };
      });
      return { kind, steps, step: 0, bake: null };
    });
    return { level: levelIndex, t: 0, orders, current: 0, done: false, events: [], perfect: 0, burnt: 0, doughy: 0,
      lastPose: null, rollLo: null, rollHi: null, rollDir: 0, needle: 0, jarHover: null, jarT: 0 };
  }

  const curStep = (d) => { const o = d.orders[d.current]; return o && o.steps[o.step]; };

  function advance(d) {
    const o = d.orders[d.current];
    o.step++;
    d.needle = 0; d.rollLo = d.rollHi = null; d.rollDir = 0; d.jarHover = null; d.jarT = 0;
    if (o.step >= o.steps.length) {
      d.events.push({ type: 'served', kind: o.kind, bake: o.bake });
      d.current++;
      if (d.current >= d.orders.length) { d.done = true; d.events.push({ type: 'done' }); }
      else d.events.push({ type: 'customer', kind: d.orders[d.current].kind });
    } else d.events.push({ type: 'step', step: o.steps[o.step].type });
  }

  function step(d, dt, hand) {
    if (d.done) return;
    d.t += dt;
    const s = curStep(d), lv = LEVELS[d.level];
    if (!s) return;
    const pose = hand ? hand.pose : null;
    if (s.type === 'knead') {
      // A knead is a hand closing into a fist after being open.
      if (pose === 'fist' && d.lastPose === 'open') { s.done++; d.events.push({ type: 'knead', done: s.done, need: s.need }); }
      if (s.done >= s.need) advance(d);
    } else if (s.type === 'roll') {
      // A roll is a sweep of the hand measured from where it last turned round, each way in turn.
      if (hand) {
        if (d.rollLo === null) { d.rollLo = d.rollHi = hand.x; }
        d.rollLo = Math.min(d.rollLo, hand.x); d.rollHi = Math.max(d.rollHi, hand.x);
        let dir = 0;
        if (hand.x - d.rollLo >= ROLL_SWEEP && d.rollDir !== 1) dir = 1;
        else if (d.rollHi - hand.x >= ROLL_SWEEP && d.rollDir !== -1) dir = -1;
        if (dir) {
          d.rollDir = dir; d.rollLo = d.rollHi = hand.x; s.done++;
          d.events.push({ type: 'roll', done: s.done, need: s.need });
          if (s.done >= s.need) advance(d);
        }
      }
    } else if (s.type === 'bake') {
      d.needle += dt / BAKE_SECONDS;
      const stop = (pose === 'fist' && d.lastPose && d.lastPose !== 'fist') || d.needle >= BAKE_MAX;
      if (stop) {
        const q = d.needle < lv.zone[0] ? 'doughy' : d.needle > lv.zone[1] ? 'burnt' : 'perfect';
        d.orders[d.current].bake = q;
        if (q === 'perfect') d.perfect++; else if (q === 'burnt') d.burnt++; else d.doughy++;
        d.events.push({ type: 'baked', quality: q });
        advance(d);
      }
    } else if (s.type === 'decorate') {
      let over = null;
      if (hand && pose !== 'fist') for (const j of JARS) if (Math.abs(hand.x - j.x) < JAR_HALF && Math.abs(hand.y - JAR_Y) < JAR_HALF * 1.6) over = j.id;
      if (over !== d.jarHover) { d.jarHover = over; d.jarT = 0; }
      if (over) {
        d.jarT += dt;
        if (d.jarT >= JAR_HOLD) {
          d.jarT = 0;
          if (over === s.toppings[s.done]) { s.done++; d.events.push({ type: 'topping', id: over }); if (s.done >= s.need) advance(d); }
          else { d.events.push({ type: 'wrongjar', id: over }); d.jarHover = null; }
        }
      }
    }
    d.lastPose = pose;
  }

  function result(d) {
    const lv = LEVELS[d.level], total = d.orders.length;
    const stars = d.perfect === total && d.t <= lv.par ? 3 : d.perfect * 2 >= total && d.t <= lv.par * 1.5 ? 2 : 1;
    return { stars, perfect: d.perfect, total, burnt: d.burnt, doughy: d.doughy, seconds: Math.round(d.t),
      score: 100 + d.perfect * 40 + stars * 30 + Math.max(0, Math.round(lv.par * 1.5 - d.t)) };
  }

  root.Bakery = { JARS, JAR_Y, JAR_HALF, JAR_HOLD, ROLL_SWEEP, BAKE_SECONDS, BAKE_MAX, TREATS, LEVELS, createDay, step, result, curStep };
})(typeof window !== 'undefined' ? window : globalThis);
