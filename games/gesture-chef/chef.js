// Burger Truck rules: stations, orders, cooking timers, customers and scoring. No drawing, so it runs headless in tests.
(function (root) {
  const FILLINGS = ['patty', 'cheese', 'lettuce', 'tomato', 'onion', 'bacon'];
  const PRICE = { patty: 4, cheese: 1, lettuce: 1, tomato: 1, onion: 1, bacon: 2, fries: 3, drink: 2 };
  // Seconds on the grill or in the fryer before food is done, and before it burns.
  const COOK = { patty: [6, 13], fries: [5, 12] };
  const DRINK_FILL = 3;

  // Each day adds something new; spawn is seconds between customers.
  const DAYS = [
    { name: 'Opening day', toppings: [], sides: [], length: 90, spawn: 16, patience: 75, goal: 20, max: 2 },
    { name: 'Say cheese', toppings: ['cheese'], sides: [], length: 100, spawn: 15, patience: 75, goal: 30, max: 2 },
    { name: 'Garden fresh', toppings: ['cheese', 'lettuce'], sides: [], length: 100, spawn: 16, patience: 80, goal: 34, max: 2 },
    { name: 'Hot fries', toppings: ['cheese', 'lettuce'], sides: ['fries'], length: 110, spawn: 17, patience: 85, goal: 36, max: 2 },
    { name: 'Tomato Tuesday', toppings: ['cheese', 'lettuce', 'tomato'], sides: ['fries'], length: 110, spawn: 17, patience: 85, goal: 42, max: 2 },
    { name: 'Fizzy drinks', toppings: ['cheese', 'lettuce', 'tomato'], sides: ['fries', 'drink'], length: 120, spawn: 18, patience: 90, goal: 40, max: 2 },
    { name: 'Double trouble', toppings: ['cheese', 'lettuce', 'tomato'], sides: ['fries', 'drink'], length: 120, spawn: 17, patience: 90, goal: 46, max: 3, doubles: true },
    { name: 'Onion rings', toppings: ['cheese', 'lettuce', 'tomato', 'onion'], sides: ['fries', 'drink'], length: 130, spawn: 17, patience: 90, goal: 50, max: 3, doubles: true },
    { name: 'Bacon bonanza', toppings: ['cheese', 'lettuce', 'tomato', 'onion', 'bacon'], sides: ['fries', 'drink'], length: 130, spawn: 17, patience: 95, goal: 46, max: 3, doubles: true },
    { name: 'Food festival', toppings: ['cheese', 'lettuce', 'tomato', 'onion', 'bacon'], sides: ['fries', 'drink'], length: 140, spawn: 15, patience: 90, goal: 54, max: 3, doubles: true },
  ];
  const SEATS = 3, GRILLS = 3;

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function createDay(level, opts = {}) {
    const d = DAYS[level];
    return {
      level, day: d, t: 0, over: false, coins: 0, served: 0, lost: 0, burnt: 0, wrong: 0, perfect: 0,
      random: opts.seed != null ? rng(opts.seed) : Math.random,
      held: null, // { kind, ... } or { kind: 'plate', stack }
      plate: [],
      grill: Array(GRILLS).fill(null), // { cook } seconds on the heat
      fryer: null, drink: null, // { cook } / { fill }
      seats: Array(SEATS).fill(null),
      nextCustomer: 2, customerId: 0, events: [],
    };
  }

  function makeOrder(g) {
    const d = g.day, r = g.random;
    const fill = ['patty'];
    if (d.doubles && r() < 0.3) fill.push('patty');
    for (const t of d.toppings) if (r() < 0.55) fill.push(t);
    const sides = d.sides.filter(() => r() < 0.5);
    return { burger: ['bun', ...fill, 'top'], sides };
  }

  function orderValue(o) { return o.burger.reduce((s, k) => s + (PRICE[k] || 0), 0) + o.sides.reduce((s, k) => s + PRICE[k], 0); }

  function spawn(g) {
    const free = g.seats.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
    if (!free.length || g.seats.filter(Boolean).length >= g.day.max) return;
    const seat = free[Math.floor(g.random() * free.length)];
    const order = makeOrder(g);
    g.seats[seat] = { id: ++g.customerId, order, wait: 0, patience: g.day.patience + order.burger.length * 2, burgerDone: false, sidesGot: [], look: Math.floor(g.random() * 6) };
    g.events.push({ type: 'arrive', seat });
  }

  function step(g, dt) {
    if (g.over) return;
    g.t += dt;
    for (const s of g.grill) if (s) {
      const before = state(s.cook, COOK.patty);
      s.cook += dt;
      const after = state(s.cook, COOK.patty);
      if (after !== before) g.events.push({ type: after === 'done' ? 'patty-done' : 'patty-burnt' });
    }
    if (g.fryer) {
      const before = state(g.fryer.cook, COOK.fries);
      g.fryer.cook += dt;
      const after = state(g.fryer.cook, COOK.fries);
      if (after !== before) g.events.push({ type: after === 'done' ? 'fries-done' : 'fries-burnt' });
    }
    if (g.drink && g.drink.fill < DRINK_FILL) { g.drink.fill += dt; if (g.drink.fill >= DRINK_FILL) g.events.push({ type: 'drink-full' }); }
    g.seats.forEach((c, i) => {
      if (!c) return;
      c.wait += dt;
      if (c.wait >= c.patience) { g.seats[i] = null; g.lost++; g.events.push({ type: 'leave', seat: i }); }
    });
    if (g.t < g.day.length) {
      g.nextCustomer -= dt;
      if (g.nextCustomer <= 0) { spawn(g); g.nextCustomer = g.day.spawn * (0.8 + g.random() * 0.4); }
    }
    // The day closes once time is up and the last customer has gone.
    if (g.t >= g.day.length && g.seats.every((c) => !c)) { g.over = true; g.events.push({ type: 'closed' }); }
  }

  const state = (cook, [done, burnt]) => (cook >= burnt ? 'burnt' : cook >= done ? 'done' : 'raw');
  const pattyOf = (cook) => ({ kind: 'patty', cook: state(cook, COOK.patty) });

  // Station ids: bin:<kind>, grill:<n>, fryer, drink, plate, trash, seat:<n>.
  function grab(g, station) {
    if (g.held) return false;
    const [type, arg] = station.split(':');
    if (type === 'bin') {
      if (!available(g).includes(arg)) return false;
      g.held = arg === 'patty' ? { kind: 'patty', cook: 'raw' } : arg === 'potato' ? { kind: 'potato' } : arg === 'cup' ? { kind: 'cup' } : { kind: arg };
    } else if (type === 'grill') {
      const s = g.grill[+arg]; if (!s) return false;
      g.held = { ...pattyOf(s.cook), sec: s.cook }; g.grill[+arg] = null;
    } else if (type === 'fryer') {
      if (!g.fryer) return false;
      const st = state(g.fryer.cook, COOK.fries);
      g.held = { kind: 'fries', cook: st, sec: g.fryer.cook }; g.fryer = null;
    } else if (type === 'drink') {
      if (!g.drink) return false;
      g.held = g.drink.fill >= DRINK_FILL ? { kind: 'drink' } : { kind: 'cup', sec: g.drink.fill }; g.drink = null;
    } else if (type === 'plate') {
      if (!g.plate.length) return false;
      g.held = { kind: 'plate', stack: g.plate }; g.plate = [];
    } else return false;
    g.held.from = station;
    g.events.push({ type: 'grab', what: g.held.kind });
    return true;
  }

  // Returns what happened, so the page can explain a refused drop; a refused item stays in the hand.
  // A refused drop puts the food back where it came from, so nothing sticks to the hand.
  function drop(g, station) {
    const r = place(g, station);
    if (g.held && r !== 'empty') giveBack(g);
    return r;
  }
  function giveBack(g) {
    const h = g.held, [type, arg] = (h.from || '').split(':');
    g.held = null;
    if (type === 'grill' && !g.grill[+arg]) g.grill[+arg] = { cook: h.sec || 0 };
    else if (type === 'fryer' && !g.fryer) g.fryer = { cook: h.sec || 0 };
    else if (type === 'drink' && !g.drink) g.drink = { fill: h.kind === 'drink' ? DRINK_FILL : h.sec || 0 };
    else if (type === 'plate' && !g.plate.length) g.plate = h.stack;
    g.events.push({ type: 'returned', from: h.from });
  }

  function place(g, station) {
    const h = g.held;
    if (!h) return 'empty';
    const [type, arg] = station ? station.split(':') : [''];
    const done = (why) => { g.held = null; g.events.push({ type: 'drop', why }); return why; };
    if (type === 'trash') {
      if (h.kind === 'patty' && h.cook === 'burnt') g.burnt++;
      return done('trash');
    }
    if (type === 'grill' && h.kind === 'patty' && !g.grill[+arg]) {
      g.grill[+arg] = { cook: h.sec != null ? h.sec : h.cook === 'raw' ? 0 : h.cook === 'done' ? COOK.patty[0] : COOK.patty[1] };
      return done('grill');
    }
    if (type === 'fryer' && (h.kind === 'potato' || h.kind === 'fries') && !g.fryer) {
      g.fryer = { cook: h.kind === 'potato' ? 0 : h.cook === 'burnt' ? COOK.fries[1] : COOK.fries[0] };
      return done('fryer');
    }
    if (type === 'drink' && (h.kind === 'cup' || h.kind === 'drink') && !g.drink) {
      g.drink = { fill: h.kind === 'drink' ? DRINK_FILL : 0 };
      return done('drink');
    }
    if (type === 'plate') {
      if (h.kind === 'plate') { g.plate = h.stack; return done('plate'); }
      if (h.kind === 'patty' && h.cook === 'raw') return 'raw';
      if (!['bun', 'top', ...FILLINGS].includes(h.kind)) return 'not-burger';
      if (g.plate.length && g.plate[g.plate.length - 1] === 'top') return 'closed';
      g.plate.push(h.kind === 'patty' ? (h.cook === 'burnt' ? 'burnt' : 'patty') : h.kind);
      return done('stack');
    }
    if (type === 'seat') {
      const c = g.seats[+arg];
      if (!c) return 'no-one';
      if (h.kind === 'plate') {
        if (c.burgerDone) return 'has-burger';
        if (!sameBurger(h.stack, c.order.burger)) { g.wrong++; g.events.push({ type: 'wrong', seat: +arg }); return 'wrong'; }
        c.burgerDone = true; g.held = null;
        g.events.push({ type: 'burger', seat: +arg });
      } else if (h.kind === 'fries' || h.kind === 'drink') {
        if (h.kind === 'fries' && h.cook !== 'done') return h.cook === 'raw' ? 'raw' : 'burnt';
        if (!c.order.sides.includes(h.kind) || c.sidesGot.includes(h.kind)) return 'not-wanted';
        c.sidesGot.push(h.kind); g.held = null;
        g.events.push({ type: 'side', seat: +arg, what: h.kind });
      } else return 'not-wanted';
      if (c.burgerDone && c.order.sides.every((s) => c.sidesGot.includes(s))) pay(g, +arg);
      return 'served';
    }
    return 'nowhere';
  }

  // Bun at the bottom, top bun last, and the same fillings in any order in between.
  function sameBurger(stack, want) {
    if (stack.length !== want.length || stack[0] !== 'bun' || stack[stack.length - 1] !== 'top') return false;
    const a = stack.slice(1, -1).sort().join(), b = want.slice(1, -1).sort().join();
    return a === b;
  }

  function pay(g, seat) {
    const c = g.seats[seat];
    const left = 1 - c.wait / c.patience;
    const tip = left > 0.6 ? 3 : left > 0.3 ? 1 : 0;
    const coins = orderValue(c.order) + tip;
    g.coins += coins; g.served++; if (tip === 3) g.perfect++;
    g.seats[seat] = null;
    g.events.push({ type: 'pay', seat, coins, tip });
  }

  function available(g) {
    const d = g.day, out = ['bun', 'top', 'patty', ...d.toppings];
    if (d.sides.includes('fries')) out.push('potato');
    if (d.sides.includes('drink')) out.push('cup');
    return out;
  }

  function result(g) {
    const goal = g.day.goal;
    const stars = g.coins >= goal * 1.4 ? 3 : g.coins >= goal ? 2 : g.coins >= goal * 0.5 ? 1 : 0;
    return { coins: g.coins, goal, served: g.served, lost: g.lost, burnt: g.burnt, wrong: g.wrong, perfect: g.perfect, stars, score: g.coins * 10 + g.perfect * 15 };
  }

  root.Chef = { DAYS, FILLINGS, PRICE, COOK, DRINK_FILL, GRILLS, SEATS, createDay, step, grab, drop, available, sameBurger, orderValue, result, cookState: state };
})(typeof window !== 'undefined' ? window : globalThis);
