// Hand shapes and story rules, free of rendering and camera, so both can be tested headless.
(function (root) {
  // Which of index, middle, ring and pinky are straight. The thumb is ignored: it is hard to see from a sofa.
  const SHAPES = {
    snail:  { name: 'Snail',  fingers: [0, 0, 0, 0], how: 'Make a fist' },
    swan:   { name: 'Swan',   fingers: [1, 0, 0, 0], how: 'Point one finger up' },
    rabbit: { name: 'Rabbit', fingers: [1, 1, 0, 0], how: 'Two fingers up, like ears' },
    deer:   { name: 'Deer',   fingers: [1, 0, 0, 1], how: 'First and little finger up' },
    bird:   { name: 'Bird',   fingers: [1, 1, 1, 1], how: 'Open your whole hand' },
  };
  const SHAPE_ORDER = ['rabbit', 'swan', 'snail', 'deer', 'bird'];
  const FINGERS = [[8, 6], [12, 10], [16, 14], [20, 18]];

  // 1 straight, 0 curled, -1 unsure; judged by distance from the wrist, so any hand angle works.
  function fingerStates(lm) {
    const d = (a) => Math.hypot(lm[a].x - lm[0].x, lm[a].y - lm[0].y);
    return FINGERS.map(([tip, pip]) => {
      const r = d(tip) / d(pip);
      return r > 1.12 ? 1 : r < 1.0 ? 0 : -1;
    });
  }

  // An unsure finger may match either way, but only one shape may fit.
  function classify(lm) {
    const st = fingerStates(lm);
    const fits = SHAPE_ORDER.filter((id) => SHAPES[id].fingers.every((f, i) => st[i] === -1 || st[i] === f));
    if (fits.length !== 1) return null;
    if (st.filter((s) => s === -1).length > 1) return null;
    return fits[0];
  }

  const ZONE_R = 0.12;
  const HOLD = 0.8;

  // Zones are spots on the wall (0..1 across and down) where the animal has to go.
  const LEVELS = [
    { name: "Rabbit's Garden", par: 16, steps: [
      { shape: 'rabbit', at: [0.25, 0.65], prop: 'carrot', text: 'The rabbit is hungry. Hop to the carrot!' },
      { shape: 'rabbit', at: [0.72, 0.62], prop: 'carrot', text: 'One more carrot over there!' },
      { shape: 'rabbit', at: [0.5, 0.75], prop: 'burrow', text: 'Time for a nap. Hop home to the burrow.' },
    ] },
    { name: 'Swan Lake', par: 16, steps: [
      { shape: 'swan', at: [0.3, 0.7], prop: 'lily', text: 'The swan glides to the water lily.' },
      { shape: 'swan', at: [0.7, 0.68], prop: 'lily', text: 'Another lily is floating there.' },
      { shape: 'swan', at: [0.5, 0.45], prop: 'moon', text: 'Swim to the moon in the water.' },
    ] },
    { name: 'Slow Snail', par: 18, steps: [
      { shape: 'snail', at: [0.22, 0.72], prop: 'leaf', text: 'The snail wants a crunchy leaf.' },
      { shape: 'snail', at: [0.5, 0.6], prop: 'mushroom', text: 'Slide up to the mushroom.' },
      { shape: 'snail', at: [0.78, 0.72], prop: 'leaf', text: 'One more leaf for dessert!' },
    ] },
    { name: 'Forest Deer', par: 18, steps: [
      { shape: 'deer', at: [0.28, 0.55], prop: 'tree', text: 'The deer walks to the old tree.' },
      { shape: 'deer', at: [0.7, 0.7], prop: 'stream', text: 'Take a drink at the stream.' },
      { shape: 'deer', at: [0.5, 0.4], prop: 'tree', text: 'Rest under the tall tree.' },
    ] },
    { name: 'Up in the Sky', par: 18, steps: [
      { shape: 'bird', at: [0.2, 0.3], prop: 'cloud', text: 'The bird flies to the cloud.' },
      { shape: 'bird', at: [0.8, 0.28], prop: 'cloud', text: 'Fly to the other cloud.' },
      { shape: 'bird', at: [0.5, 0.55], prop: 'nest', text: 'Back to the nest!' },
    ] },
    { name: 'Morning Friends', par: 24, steps: [
      { shape: 'bird', at: [0.75, 0.3], prop: 'sun', text: 'The bird wakes up the sun.' },
      { shape: 'rabbit', at: [0.25, 0.7], prop: 'carrot', text: 'The rabbit finds breakfast.' },
      { shape: 'swan', at: [0.6, 0.72], prop: 'lily', text: 'The swan says good morning to the lily.' },
      { shape: 'snail', at: [0.32, 0.5], prop: 'mushroom', text: 'The snail climbs the mushroom.' },
    ] },
    { name: 'Hide and Seek', par: 26, steps: [
      { shape: 'deer', at: [0.2, 0.5], prop: 'tree', text: 'The deer hides behind a tree.' },
      { shape: 'rabbit', at: [0.78, 0.74], prop: 'burrow', text: 'The rabbit hides in the burrow.' },
      { shape: 'bird', at: [0.5, 0.25], prop: 'cloud', text: 'The bird hides in a cloud.' },
      { shape: 'snail', at: [0.3, 0.75], prop: 'leaf', text: 'The snail hides under a leaf.' },
    ] },
    { name: 'Rainy Day', par: 30, steps: [
      { shape: 'snail', at: [0.7, 0.72], prop: 'mushroom', text: 'Rain! The snail runs under the mushroom.' },
      { shape: 'bird', at: [0.25, 0.4], prop: 'nest', text: 'The bird flies to its dry nest.' },
      { shape: 'swan', at: [0.55, 0.7], prop: 'lily', text: 'The swan loves the rain. Swim to the lily!' },
      { shape: 'rabbit', at: [0.82, 0.6], prop: 'burrow', text: 'The rabbit hops home.' },
      { shape: 'deer', at: [0.4, 0.5], prop: 'tree', text: 'The deer shelters under the tree.' },
    ] },
    { name: 'Moonlight Parade', par: 32, steps: [
      { shape: 'swan', at: [0.15, 0.7], prop: 'lily', text: 'The parade starts at the pond.' },
      { shape: 'deer', at: [0.35, 0.5], prop: 'tree', text: 'The deer marches past the tree.' },
      { shape: 'rabbit', at: [0.55, 0.72], prop: 'carrot', text: 'The rabbit hops to the carrot.' },
      { shape: 'snail', at: [0.8, 0.62], prop: 'leaf', text: 'The snail is slow but happy.' },
      { shape: 'bird', at: [0.85, 0.3], prop: 'moon', text: 'The bird flies up to the moon!' },
    ] },
    { name: 'The Big Show', par: 38, steps: [
      { shape: 'rabbit', at: [0.2, 0.7], prop: 'star', text: 'Welcome to the big show! First, the rabbit.' },
      { shape: 'bird', at: [0.8, 0.25], prop: 'star', text: 'Now the bird flies high.' },
      { shape: 'snail', at: [0.5, 0.75], prop: 'star', text: 'The snail takes a slow bow.' },
      { shape: 'deer', at: [0.3, 0.4], prop: 'star', text: 'The deer leaps in!' },
      { shape: 'swan', at: [0.7, 0.6], prop: 'star', text: 'The swan dances.' },
      { shape: 'bird', at: [0.5, 0.35], prop: 'star', text: 'And the bird closes the show!' },
    ] },
  ];

  function createStory(i) {
    return { level: i, step: 0, hold: 0, t: 0, done: false, events: [] };
  }

  // shape: recognised shape or null; pos: hand position on the wall, 0..1, or null when no hand.
  function update(s, shape, pos, dt) {
    if (s.done) return;
    s.t += dt;
    const step = LEVELS[s.level].steps[s.step];
    const inZone = !!pos && Math.hypot(pos.x - step.at[0], pos.y - step.at[1]) < ZONE_R;
    if (shape === step.shape && inZone) s.hold += dt;
    else s.hold = Math.max(0, s.hold - dt * 2);
    if (s.hold >= HOLD) {
      s.events.push({ type: 'step', index: s.step });
      s.step++; s.hold = 0;
      if (s.step >= LEVELS[s.level].steps.length) { s.done = true; s.events.push({ type: 'done' }); }
    }
  }

  function result(s) {
    const par = LEVELS[s.level].par;
    const stars = s.t <= par ? 3 : s.t <= par * 1.6 ? 2 : 1;
    return { stars, seconds: Math.round(s.t), score: 100 + stars * 30 + Math.max(0, Math.round(par * 2 - s.t)) };
  }

  root.Shadows = { SHAPES, SHAPE_ORDER, LEVELS, ZONE_R, HOLD, fingerStates, classify, createStory, update, result };
})(typeof window !== 'undefined' ? window : globalThis);
